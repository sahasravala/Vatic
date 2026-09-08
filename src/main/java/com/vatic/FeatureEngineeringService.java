package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class FeatureEngineeringService {

    @Autowired
    private HistoricalPriceRepository historicalPriceRepository;

    public List<MarketFeatures> generateFeatures(String symbol) {

        String normalizedSymbol = symbol.toUpperCase();

        List<HistoricalPrice> prices =
                historicalPriceRepository
                        .findBySymbolOrderByDateDesc(normalizedSymbol);

        prices.sort(
                Comparator.comparing(HistoricalPrice::getDate)
        );

        List<MarketFeatures> features = new ArrayList<>();

        for (int i = 20; i < prices.size(); i++) {

            HistoricalPrice current = prices.get(i);
            HistoricalPrice previous = prices.get(i - 1);

            double dailyReturn =
                    (current.getClose() - previous.getClose())
                            / previous.getClose();

            double movingAverage5 =
                    calculateMovingAverage(prices, i, 5);

            double movingAverage20 =
                    calculateMovingAverage(prices, i, 20);

            double momentum5 =
                    (current.getClose() - prices.get(i - 5).getClose())
                            / prices.get(i - 5).getClose();

            double volatility20 =
                    calculateVolatility(prices, i, 20);

            double volumeChange =
                    (double) (current.getVolume() - previous.getVolume())
                            / previous.getVolume();

            MarketFeatures marketFeatures = new MarketFeatures(
                    normalizedSymbol,
                    current.getDate(),
                    current.getClose(),
                    dailyReturn,
                    movingAverage5,
                    movingAverage20,
                    momentum5,
                    volatility20,
                    volumeChange
            );

            features.add(marketFeatures);
        }

        features.sort(
                Comparator.comparing(MarketFeatures::getDate).reversed()
        );

        return features;
    }

    private double calculateMovingAverage(
            List<HistoricalPrice> prices,
            int currentIndex,
            int days
    ) {

        double sum = 0;

        for (int i = currentIndex - days + 1;
             i <= currentIndex;
             i++) {

            sum += prices.get(i).getClose();
        }

        return sum / days;
    }

    private double calculateVolatility(
            List<HistoricalPrice> prices,
            int currentIndex,
            int days
    ) {

        List<Double> returns = new ArrayList<>();

        for (int i = currentIndex - days + 1;
             i <= currentIndex;
             i++) {

            HistoricalPrice current = prices.get(i);
            HistoricalPrice previous = prices.get(i - 1);

            double dailyReturn =
                    (current.getClose() - previous.getClose())
                            / previous.getClose();

            returns.add(dailyReturn);
        }

        double mean =
                returns.stream()
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0.0);

        double squaredDifferences = 0;

        for (double dailyReturn : returns) {
            squaredDifferences +=
                    Math.pow(dailyReturn - mean, 2);
        }

        return Math.sqrt(
                squaredDifferences / returns.size()
        );
    }
}