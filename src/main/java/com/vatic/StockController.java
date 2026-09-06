package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
public class StockController {

    @Autowired
    private StockRepository stockRepository;

    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of("message", "Vatic API is running");
    }

    @GetMapping("/stocks")
    public List<Stock> getAllStocks() {
        return stockRepository.findAll();
    }

    @PostMapping("/stocks")
    public Stock addStock(@RequestBody Stock stock) {
        return stockRepository.save(stock);
    }
}