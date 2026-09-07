package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/predictions")
public class PredictionController {

    @Autowired
    private PredictionRepository predictionRepository;

    @GetMapping
    public List<Prediction> getAllPredictions() {
        return predictionRepository.findAll();
    }

    @GetMapping("/{symbol}")
    public List<Prediction> getPredictionsBySymbol(@PathVariable String symbol) {
        return predictionRepository.findBySymbol(symbol);
    }

    @PostMapping
    public Prediction addPrediction(@RequestBody Prediction prediction) {
        return predictionRepository.save(prediction);
    }

    @PutMapping("/{id}/outcome")
    public Prediction updateOutcome(@PathVariable Long id, @RequestBody Prediction update) {
        Prediction prediction = predictionRepository.findById(id).orElseThrow();
        prediction.setActualDirection(update.getActualDirection());
        prediction.setWasCorrect(
            prediction.getPredictedDirection().equals(update.getActualDirection())
        );
        return predictionRepository.save(prediction);
    }

    @GetMapping("/accuracy")
    public Map<String, Object> getAccuracy() {
        List<Prediction> scored = predictionRepository.findByWasCorrectIsNotNull();

        Map<String, long[]> modelStats = new HashMap<>();

        for (Prediction p : scored) {
            modelStats.putIfAbsent(p.getModelUsed(), new long[]{0, 0});
            modelStats.get(p.getModelUsed())[1]++;
            if (p.getWasCorrect()) {
                modelStats.get(p.getModelUsed())[0]++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        for (Map.Entry<String, long[]> entry : modelStats.entrySet()) {
            long correct = entry.getValue()[0];
            long total = entry.getValue()[1];
            result.put(entry.getKey(), Map.of(
                "correct", correct,
                "total", total,
                "accuracy", total > 0 ? Math.round((double) correct / total * 100) + "%" : "N/A"
            ));
        }

        return result;
    }
}