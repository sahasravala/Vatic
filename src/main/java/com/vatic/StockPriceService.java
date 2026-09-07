package com.vatic;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class StockPriceService {

    @Value("${alphavantage.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> getQuote(String symbol) {
        String url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=" 
                     + symbol + "&apikey=" + apiKey;
        return restTemplate.getForObject(url, Map.class);
    }
}