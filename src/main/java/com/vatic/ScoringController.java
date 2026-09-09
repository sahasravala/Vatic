package com.vatic;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/scoring")
public class ScoringController {

    private final ScoringService scoringService;

    public ScoringController(ScoringService scoringService) {
        this.scoringService = scoringService;
    }

    /** Runs the same job the scheduler runs. Useful for testing and backfilling. */
    @PostMapping("/run")
    public Map<String, Object> runNow() {
        return scoringService.scoreAllPending();
    }
}