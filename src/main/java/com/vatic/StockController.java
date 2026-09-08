package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

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

    @PostMapping("/stocks")
    public Stock addStock(@RequestBody Stock stock) {
        return stockRepository.save(stock);
    }

    @PostMapping("/stocks/history/backfill")
    public Map<String, Object> backfillHistory(
        @RequestBody List<HistoricalPrice> prices
    ) {

        int inserted = 0;
        int skipped = 0;

        for (HistoricalPrice price : prices) {

            String normalizedSymbol =
                    price.getSymbol().toUpperCase();

            price.setSymbol(normalizedSymbol);

            boolean alreadyExists =
                    historicalPriceRepository
                            .findBySymbolAndDate(
                                    normalizedSymbol,
                                    price.getDate()
                             )
                            .isPresent();

            if (alreadyExists) {
                skipped++;
                continue;
            }

            historicalPriceRepository.save(price);
            inserted++;
        }

        return Map.of(
                "received", prices.size(),
                "inserted", inserted,
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