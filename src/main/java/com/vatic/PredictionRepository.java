package com.vatic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    List<Prediction> findBySymbol(String symbol);
    List<Prediction> findByModelUsed(String modelUsed);
    List<Prediction> findByWasCorrectIsNotNull();
}