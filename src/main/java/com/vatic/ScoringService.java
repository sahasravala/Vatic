package com.vatic;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ScoringService {

    private static final Logger log = LoggerFactory.getLogger(ScoringService.class);

    private final UserPredictionRepository userPredictionRepository;
    private final PredictionRepository predictionRepository;
    private final HistoricalPriceRepository historicalPriceRepository;

    public ScoringService(UserPredictionRepository userPredictionRepository,
                          PredictionRepository predictionRepository,
                          HistoricalPriceRepository historicalPriceRepository) {
        this.userPredictionRepository = userPredictionRepository;
        this.predictionRepository = predictionRepository;
        this.historicalPriceRepository = historicalPriceRepository;
    }

    /**
     * Runs weeknights at 6pm Eastern, after the market has closed and
     * the day's closing price is available.
     */
    @Scheduled(cron = "0 0 18 * * MON-FRI", zone = "America/New_York")
    public void scheduledScoring() {
        log.info("Scheduled scoring run starting");
        Map<String, Object> result = scoreAllPending();
        log.info("Scoring complete: {}", result);
    }

    /**
     * Scores every prediction whose target date has passed and whose outcome
     * we can determine from stored price history.
     *
     * Safe to run repeatedly: predictions that already have an outcome are
     * filtered out by the query, so a second run in the same day does nothing.
     */
    public Map<String, Object> scoreAllPending() {

        LocalDate today = LocalDate.now();

        List<UserPrediction> pending =
                userPredictionRepository.findByWasCorrectIsNullAndTargetDateLessThanEqual(today);

        int scored = 0;
        int skipped = 0;

        // cache price lookups so we hit the database once per symbol, not once per prediction
        Map<String, List<HistoricalPrice>> priceCache = new HashMap<>();

        for (UserPrediction p : pending) {

            List<HistoricalPrice> prices = priceCache.computeIfAbsent(
                    p.getSymbol(),
                    sym -> {
                        List<HistoricalPrice> list =
                                historicalPriceRepository.findBySymbolOrderByDateDesc(sym);
                        list.sort(Comparator.comparing(HistoricalPrice::getDate));
                        return list;
                    });

            String actual = resolveDirection(prices, p.getTargetDate());

            if (actual == null) {
                // no closing price stored for that date yet — try again next run
                skipped++;
                continue;
            }

            p.setActualDirection(actual);
            p.setWasCorrect(actual.equals(p.getDirection()));
            p.setScoredAt(LocalDateTime.now());
            scored++;
        }

        userPredictionRepository.saveAll(pending);

        Map<String, Object> summary = new HashMap<>();
        summary.put("pending", pending.size());
        summary.put("scored", scored);
        summary.put("awaitingData", skipped);
        summary.put("ranAt", LocalDateTime.now().toString());
        return summary;
    }

    /**
     * Was the close on targetDate higher than the previous trading day's close?
     * Returns null when we do not yet have the data.
     */
    private String resolveDirection(List<HistoricalPrice> prices, LocalDate targetDate) {

        int index = -1;
        for (int i = 0; i < prices.size(); i++) {
            if (prices.get(i).getDate().equals(targetDate)) {
                index = i;
                break;
            }
        }

        if (index <= 0) {
            return null; // not found, or no previous day to compare against
        }

        double close = prices.get(index).getClose();
        double previousClose = prices.get(index - 1).getClose();

        return close > previousClose ? "UP" : "DOWN";
    }
}
