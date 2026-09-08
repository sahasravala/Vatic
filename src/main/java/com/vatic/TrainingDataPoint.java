package com.vatic;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class TrainingDataPoint {

    private String symbol;
    private LocalDate date;

    private double dailyReturn;
    private double movingAverage5;
    private double movingAverage20;
    private double momentum5;
    private double volatility20;
    private double volumeChange;

    private String target;
}