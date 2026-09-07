package com.vatic;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "predictions")
@Data
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String predictedDirection; // UP or DOWN

    @Column(nullable = false)
    private Double confidence;

    @Column(nullable = false)
    private LocalDate predictionDate;

    private String actualDirection; // filled in later

    private Boolean wasCorrect; // filled in later

    @Column(nullable = false)
    private String modelUsed;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
