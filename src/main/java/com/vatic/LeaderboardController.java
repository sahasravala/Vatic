package com.vatic;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class LeaderboardController {

    /** Below this many scored calls, accuracy is mostly noise. */
    private static final int MIN_SCORED = 10;

    private final UserPredictionRepository userPredictionRepository;
    private final PredictionRepository predictionRepository;

    public LeaderboardController(UserPredictionRepository userPredictionRepository,
                                 PredictionRepository predictionRepository) {
        this.userPredictionRepository = userPredictionRepository;
        this.predictionRepository = predictionRepository;
    }

    @GetMapping("/leaderboard")
    public Map<String, Object> leaderboard() {

        Map<String, long[]> tally = new HashMap<>(); // name -> [correct, total]
        Map<String, String> kind = new HashMap<>();  // name -> human | model

        for (UserPrediction p : userPredictionRepository.findByWasCorrectIsNotNull()) {
            long[] s = tally.computeIfAbsent(p.getUsername(), k -> new long[2]);
            s[1]++;
            if (Boolean.TRUE.equals(p.getWasCorrect())) s[0]++;
            kind.put(p.getUsername(), "human");
        }

        for (Prediction p : predictionRepository.findByWasCorrectIsNotNull()) {
            String name = p.getModelUsed().replace("_", " ");
            long[] s = tally.computeIfAbsent(name, k -> new long[2]);
            s[1]++;
            if (Boolean.TRUE.equals(p.getWasCorrect())) s[0]++;
            kind.put(name, "model");
        }

        List<Map<String, Object>> ranked = new ArrayList<>();
        List<Map<String, Object>> provisional = new ArrayList<>();

        tally.forEach((name, s) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("name", name);
            row.put("type", kind.get(name));
            row.put("correct", s[0]);
            row.put("total", s[1]);
            row.put("accuracy", s[1] > 0 ? (double) s[0] / s[1] : 0.0);
            row.put("qualified", s[1] >= MIN_SCORED);
            row.put("remaining", Math.max(0, MIN_SCORED - s[1]));

            if (s[1] >= MIN_SCORED) ranked.add(row);
            else provisional.add(row);
        });

        ranked.sort(Comparator.comparingDouble(
                (Map<String, Object> m) -> (double) m.get("accuracy")).reversed());
        for (int i = 0; i < ranked.size(); i++) ranked.get(i).put("rank", i + 1);

        provisional.sort(Comparator.comparingLong(
                (Map<String, Object> m) -> (long) m.get("total")).reversed());

        long allScored = tally.values().stream().mapToLong(s -> s[1]).sum();

        Map<String, Object> result = new HashMap<>();
        result.put("ranked", ranked);
        result.put("provisional", provisional);
        result.put("minimumScored", MIN_SCORED);
        result.put("totalPredictionsScored", allScored);
        result.put("participants", tally.size());
        return result;
    }
}