package com.vatic;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class StockController {

    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of("message", "Vatic API is running");
    }

    @GetMapping("/stocks")
    public Map<String, String> stocks() {
        return Map.of("message", "Stocks endpoint coming soon");
    }
}