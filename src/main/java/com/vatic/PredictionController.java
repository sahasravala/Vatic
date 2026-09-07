package com.vatic;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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
}