package com.vatic;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@RestController
public class EvaluationController {

    @GetMapping(value = "/evaluation", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getEvaluation() {
        try {
            ClassPathResource resource = new ClassPathResource("evaluation-results.json");
            try (InputStream in = resource.getInputStream()) {
                String json = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                return ResponseEntity.ok(json);
            }
        } catch (Exception e) {
            return ResponseEntity.status(404)
                    .body("{\"error\":\"No evaluation results found. Run train_model.py first.\"}");
        }
    }
}