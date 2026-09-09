package com.vatic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserPredictionRepository extends JpaRepository<UserPrediction, Long> {

    List<UserPrediction> findByUserIdOrderByTargetDateDesc(Long userId);

    List<UserPrediction> findByUsernameOrderByTargetDateDesc(String username);

    Optional<UserPrediction> findByUserIdAndSymbolAndTargetDate(
            Long userId, String symbol, LocalDate targetDate);

    // everything the scoring job still needs to resolve
    List<UserPrediction> findByWasCorrectIsNullAndTargetDateLessThanEqual(LocalDate date);

    List<UserPrediction> findByWasCorrectIsNotNull();

    long countByUserIdAndWasCorrectIsNotNull(Long userId);

    long countByUserIdAndWasCorrectTrue(Long userId);
}