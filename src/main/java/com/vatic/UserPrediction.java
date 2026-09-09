package com.vatic;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_predictions",
    uniqueConstraints = {
        // one call per user, per stock, per day
        @UniqueConstraint(columnNames = {"user_id", "symbol", "target_date"})
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String symbol;

    // the trading day being predicted
    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false)
    private String direction; // UP or DOWN

    // null until the scoring job runs
    @Column(name = "actual_direction")
    private String actualDirection;

    @Column(name = "was_correct")
    private Boolean wasCorrect;

    @Column(name = "scored_at")
    private LocalDateTime scoredAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}