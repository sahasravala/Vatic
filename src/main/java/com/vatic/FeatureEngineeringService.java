package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FeatureEngineeringService {

    @Autowired
    private HistoricalPriceRepository historicalPriceRepository;

    public List<MarketFeatures> generateFeatures(String symbol) {

        String normalizedSymbol = symbol.toUpperCase();

        List<HistoricalPrice> prices = loadSorted(normalizedSymbol);

        // Market context, indexed by date for fast lookup
        Map<LocalDate, Double> spyClose = closeByDate("SPY");
        Map<LocalDate, Double> vixClose = closeByDate("VIX");

        // SPY returns need ordered access
        List<HistoricalPrice> spy = loadSorted("SPY");
        Map<LocalDate, Integer> spyIndex = new HashMap<>();
        for (int i = 0; i < spy.size(); i++) {
            spyIndex.put(spy.get(i).getDate(), i);
        }

        List<MarketFeatures> features = new ArrayList<>();

        for (int i = 21; i < prices.size(); i++) {

            HistoricalPrice current = prices.get(i);
            HistoricalPrice previous = prices.get(i - 1);
            LocalDate date = current.getDate();

            // --- Stock-only features ---
            double return1d = pctChange(prices.get(i - 1).getClose(), current.getClose());
            double return2d = pctChange(prices.get(i - 2).getClose(), current.getClose());
            double return5d = pctChange(prices.get(i - 5).getClose(), current.getClose());
            double return10d = pctChange(prices.get(i - 10).getClose(), current.getClose());
            double return20d = pctChange(prices.get(i - 20).getClose(), current.getClose());

            double ma5 = movingAverage(prices, i, 5);
            double ma20 = movingAverage(prices, i, 20);

            double priceVsMa5 = pctChange(ma5, current.getClose());
            double priceVsMa20 = pctChange(ma20, current.getClose());
            double ma5VsMa20 = pctChange(ma20, ma5);

            double volatility5 = volatility(prices, i, 5);
            double volatility20 = volatility(prices, i, 20);

            double avgVolume = averageVolume(prices, i, 20);
            double volumeVsAvg = avgVolume > 0
                    ? (current.getVolume() - avgVolume) / avgVolume
                    : 0.0;

            double intradayRange = current.getClose() > 0
                    ? (current.getHigh() - current.getLow()) / current.getClose()
                    : 0.0;

            double range = current.getHigh() - current.getLow();
            double closePosition = range > 0
                    ? (current.getClose() - current.getLow()) / range
                    : 0.5;

            double gapOpen = pctChange(previous.getClose(), current.getOpen());

            // --- Market context features ---
            double marketReturn1d = 0.0;
            double marketReturn5d = 0.0;
            double marketReturn20d = 0.0;

            Integer si = spyIndex.get(date);
            if (si != null && si >= 20) {
                marketReturn1d = pctChange(spy.get(si - 1).getClose(), spy.get(si).getClose());
                marketReturn5d = pctChange(spy.get(si - 5).getClose(), spy.get(si).getClose());
                marketReturn20d = pctChange(spy.get(si - 20).getClose(), spy.get(si).getClose());
            }

            double excessReturn1d = return1d - marketReturn1d;
            double excessReturn5d = return5d - marketReturn5d;
            double relativeStrength20 = return20d - marketReturn20d;

            double vixLevel = vixClose.getOrDefault(date, 0.0);
            double vixPrev = 0.0;
            if (i >= 1) {
                vixPrev = vixClose.getOrDefault(prices.get(i - 1).getDate(), vixLevel);
            }
            double vixChange = pctChange(vixPrev, vixLevel);

            features.add(new MarketFeatures(
                    normalizedSymbol,
                    date,
                    current.getClose(),
                    return1d, return2d, return5d, return10d,
                    priceVsMa5, priceVsMa20, ma5VsMa20,
                    volatility5, volatility20,
                    volumeVsAvg,
                    intradayRange, closePosition, gapOpen,
                    marketReturn1d, marketReturn5d,
                    excessReturn1d, excessReturn5d,
                    relativeStrength20,
                    vixLevel, vixChange
            ));
        }

        features.sort(Comparator.comparing(MarketFeatures::getDate).reversed());
        return features;
    }

    public List<TrainingDataPoint> generateTrainingData(String symbol) {

        String normalizedSymbol = symbol.toUpperCase();

        List<MarketFeatures> features = generateFeatures(normalizedSymbol);
        features.sort(Comparator.comparing(MarketFeatures::getDate));

        List<HistoricalPrice> prices = loadSorted(normalizedSymbol);

        Map<LocalDate, HistoricalPrice> pricesByDate =
                prices.stream().collect(Collectors.toMap(
                        HistoricalPrice::getDate,
                        price -> price
                ));

        List<TrainingDataPoint> trainingData = new ArrayList<>();

        for (int i = 0; i < features.size() - 1; i++) {

            MarketFeatures f = features.get(i);
            MarketFeatures next = features.get(i + 1);

            HistoricalPrice currentPrice = pricesByDate.get(f.getDate());
            HistoricalPrice nextPrice = pricesByDate.get(next.getDate());

            if (currentPrice == null || nextPrice == null) continue;

            String target = nextPrice.getClose() > currentPrice.getClose() ? "UP" : "DOWN";

            trainingData.add(new TrainingDataPoint(
                    normalizedSymbol,
                    f.getDate(),
                    f.getReturn1d(), f.getReturn2d(), f.getReturn5d(), f.getReturn10d(),
                    f.getPriceVsMa5(), f.getPriceVsMa20(), f.getMa5VsMa20(),
                    f.getVolatility5(), f.getVolatility20(),
                    f.getVolumeVsAvg(),
                    f.getIntradayRange(), f.getClosePosition(), f.getGapOpen(),
                    f.getMarketReturn1d(), f.getMarketReturn5d(),
                    f.getExcessReturn1d(), f.getExcessReturn5d(),
                    f.getRelativeStrength20(),
                    f.getVixLevel(), f.getVixChange(),
                    target
            ));
        }

        trainingData.sort(Comparator.comparing(TrainingDataPoint::getDate).reversed());
        return trainingData;
    }

    // ---------- helpers ----------

    private List<HistoricalPrice> loadSorted(String symbol) {
        List<HistoricalPrice> list =
                historicalPriceRepository.findBySymbolOrderByDateDesc(symbol.toUpperCase());
        list.sort(Comparator.comparing(HistoricalPrice::getDate));
        return list;
    }

    private Map<LocalDate, Double> closeByDate(String symbol) {
        return historicalPriceRepository
                .findBySymbolOrderByDateDesc(symbol.toUpperCase())
                .stream()
                .collect(Collectors.toMap(
                        HistoricalPrice::getDate,
                        HistoricalPrice::getClose,
                        (a, b) -> a
                ));
    }

    private double pctChange(double from, double to) {
        return from != 0 ? (to - from) / from : 0.0;
    }

    private double movingAverage(List<HistoricalPrice> prices, int currentIndex, int days) {
        double sum = 0;
        for (int i = currentIndex - days + 1; i <= currentIndex; i++) {
            sum += prices.get(i).getClose();
        }
        return sum / days;
    }

    private double averageVolume(List<HistoricalPrice> prices, int currentIndex, int days) {
        double sum = 0;
        for (int i = currentIndex - days + 1; i <= currentIndex; i++) {
            sum += prices.get(i).getVolume();
        }
        return sum / days;
    }

    private double volatility(List<HistoricalPrice> prices, int currentIndex, int days) {
        List<Double> returns = new ArrayList<>();
        for (int i = currentIndex - days + 1; i <= currentIndex; i++) {
            returns.add(pctChange(prices.get(i - 1).getClose(), prices.get(i).getClose()));
        }

        double mean = returns.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

        double squaredDiffs = 0;
        for (double r : returns) {
            squaredDiffs += Math.pow(r - mean, 2);
        }

        return Math.sqrt(squaredDiffs / returns.size());
    }
}