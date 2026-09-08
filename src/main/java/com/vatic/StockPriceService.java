package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class StockPriceService {

    @Value("${alphavantage.api.key}")
    private String apiKey;

    @Autowired
    private HistoricalPriceRepository historicalPriceRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> getQuote(String symbol) {
        String url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol="
                + symbol + "&apikey=" + apiKey;

        return restTemplate.getForObject(url, Map.class);
    }

    public List<HistoricalPrice> getDailyHistory(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();

        String url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY"
                + "&symbol=" + normalizedSymbol
                + "&outputsize=compact"
                + "&apikey=" + apiKey;

        Map<String, Object> response =
                restTemplate.getForObject(url, Map.class);

        Map<String, Map<String, String>> timeSeries =
                (Map<String, Map<String, String>>) response.get("Time Series (Daily)");

        List<HistoricalPrice> existingHistory =
                historicalPriceRepository
                        .findBySymbolOrderByDateDesc(normalizedSymbol);

        Map<LocalDate, HistoricalPrice> existingByDate =
                existingHistory.stream()
                        .collect(Collectors.toMap(
                                HistoricalPrice::getDate,
                                price -> price
                        ));

        List<HistoricalPrice> history = new ArrayList<>();
        List<HistoricalPrice> newPrices = new ArrayList<>();

        for (Map.Entry<String, Map<String, String>> entry : timeSeries.entrySet()) {

            LocalDate date = LocalDate.parse(entry.getKey());
            Map<String, String> values = entry.getValue();

            HistoricalPrice price = existingByDate.get(date);

            if (price == null) {
                price = new HistoricalPrice(
                        normalizedSymbol,
                        date,
                        Double.parseDouble(values.get("1. open")),
                        Double.parseDouble(values.get("2. high")),
                        Double.parseDouble(values.get("3. low")),
                        Double.parseDouble(values.get("4. close")),
                        Long.parseLong(values.get("5. volume"))
                );

                newPrices.add(price);
            }

            history.add(price);
        }

        if (!newPrices.isEmpty()) {
            historicalPriceRepository.saveAll(newPrices);
        }

        history.sort(
                Comparator.comparing(HistoricalPrice::getDate).reversed()
        );

        return history;
    }

    public List<HistoricalPrice> getSavedHistory(String symbol) {
        return historicalPriceRepository
                .findBySymbolOrderByDateDesc(symbol.toUpperCase());
    }
}