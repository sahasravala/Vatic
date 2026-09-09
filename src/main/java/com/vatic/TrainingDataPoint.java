package com.vatic;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class TrainingDataPoint {

    private String symbol;
    private LocalDate date;

    private Double return1d;
    private Double return2d;
    private Double return5d;
    private Double return10d;

    private Double priceVsMa5;
    private Double priceVsMa20;
    private Double ma5VsMa20;

    private Double volatility5;
    private Double volatility20;

    private Double volumeVsAvg;

    private Double intradayRange;
    private Double closePosition;
    private Double gapOpen;

    // Market context
    private Double marketReturn1d;
    private Double marketReturn5d;
    private Double excessReturn1d;
    private Double excessReturn5d;
    private Double relativeStrength20;
    private Double vixLevel;
    private Double vixChange;

    private String target;
}