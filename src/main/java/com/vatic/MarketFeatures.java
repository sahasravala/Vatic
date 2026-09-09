package com.vatic;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class MarketFeatures {

    private String symbol;
    private LocalDate date;
    private Double close;

    // Returns over multiple windows
    private Double return1d;
    private Double return2d;
    private Double return5d;
    private Double return10d;

    // Price relative to moving averages
    private Double priceVsMa5;
    private Double priceVsMa20;
    private Double ma5VsMa20;

    // Volatility
    private Double volatility5;
    private Double volatility20;

    // Volume
    private Double volumeVsAvg;

    // Intraday structure
    private Double intradayRange;
    private Double closePosition;
    private Double gapOpen;

    // --- Market context (new) ---
    private Double marketReturn1d;      // SPY return today
    private Double marketReturn5d;      // SPY 5-day return
    private Double excessReturn1d;      // this stock minus SPY, today
    private Double excessReturn5d;      // this stock minus SPY, 5 days
    private Double relativeStrength20;  // 20-day return vs SPY 20-day return
    private Double vixLevel;            // VIX close (volatility regime)
    private Double vixChange;           // VIX daily change
}