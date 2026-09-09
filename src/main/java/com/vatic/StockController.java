package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
public class StockController {

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private StockPriceService stockPriceService;

    @Autowired
    private FeatureEngineeringService featureEngineeringService;

    @Autowired
    private HistoricalPriceRepository historicalPriceRepository;

    private static final List<String> TRAINING_TICKERS = List.of(
            "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AMD", "INTC", "CRM", "ORCL",
            "JPM", "BAC", "GS", "V",
            "JNJ", "UNH", "PFE",
            "WMT", "KO", "PG", "HD", "CAT", "XOM", "CVX"
    );

    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of("message", "Vatic API is running");
    }

    @GetMapping("/stocks")
    public List<Stock> getAllStocks() {
        return stockRepository.findAll();
    }

    @GetMapping("/stocks/{symbol}/features")
    public List<MarketFeatures> getFeatures(@PathVariable String symbol) {
        return featureEngineeringService.generateFeatures(symbol);
    }

    @GetMapping("/stocks/{symbol}/training-data")
    public List<TrainingDataPoint> getTrainingData(@PathVariable String symbol) {
        return featureEngineeringService.generateTrainingData(symbol);
    }

    @GetMapping("/training-data/all")
    public List<TrainingDataPoint> getAllTrainingData() {
        List<TrainingDataPoint> all = new ArrayList<>();
        for (String ticker : TRAINING_TICKERS) {
            all.addAll(featureEngineeringService.generateTrainingData(ticker));
        }
        return all;
    }

    @PostMapping("/stocks")
    public Stock addStock(@RequestBody Stock stock) {
        return stockRepository.save(stock);
    }

    @PostMapping("/stocks/history/backfill")
    public Map<String, Object> backfillHistory(
        @RequestBody List<HistoricalPrice> prices
    ) {

        if (prices.isEmpty()) {
            return Map.of("received", 0, "inserted", 0, "skipped", 0);
        }

        String normalizedSymbol = prices.get(0).getSymbol().toUpperCase();

        // One query: get every date we already have for this symbol
        Set<LocalDate> existingDates =
                historicalPriceRepository
                        .findBySymbolOrderByDateDesc(normalizedSymbol)
                        .stream()
                        .map(HistoricalPrice::getDate)
                        .collect(Collectors.toSet());

        List<HistoricalPrice> toInsert = new ArrayList<>();
        int skipped = 0;

        for (HistoricalPrice price : prices) {
            price.setSymbol(price.getSymbol().toUpperCase());

            if (existingDates.contains(price.getDate())) {
                skipped++;
                continue;
            }

            toInsert.add(price);
            existingDates.add(price.getDate());
        }

        // One batch write instead of thousands of individual saves
        historicalPriceRepository.saveAll(toInsert);

        return Map.of(
                "received", prices.size(),
                "inserted", toInsert.size(),
                "skipped", skipped
        );
    }

    @GetMapping("/stocks/{symbol}/price")
    public Map<String, Object> getPrice(@PathVariable String symbol) {
        return stockPriceService.getQuote(symbol);
    }

    @GetMapping("/stocks/{symbol}/history")
    public List<HistoricalPrice> getHistory(@PathVariable String symbol) {
        return stockPriceService.getDailyHistory(symbol);
    }

    @GetMapping("/stocks/{symbol}/history/saved")
    public List<HistoricalPrice> getSavedHistory(@PathVariable String symbol) {
        return stockPriceService.getSavedHistory(symbol);
    }
}