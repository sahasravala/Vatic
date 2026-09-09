package com.vatic;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/my-predictions")
public class UserPredictionController {

    private final UserPredictionRepository predictionRepository;
    private final UserRepository userRepository;

    private static final List<String> ALLOWED_SYMBOLS = List.of(
        "AAPL","MSFT","NVDA","GOOGL","AMZN","META","AMD","INTC","CRM","ORCL",
        "JPM","BAC","GS","V","JNJ","UNH","PFE","WMT","KO","PG","HD","CAT","XOM","CVX"
    );

    public UserPredictionController(UserPredictionRepository predictionRepository,
                                    UserRepository userRepository) {
        this.predictionRepository = predictionRepository;
        this.userRepository = userRepository;
    }

    public record PredictionRequest(String symbol, String direction) {}

    @PostMapping
    public ResponseEntity<?> makePrediction(@RequestBody PredictionRequest req, Authentication auth) {

        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sign in to make a prediction"));
        }

        Optional<User> found = userRepository.findByUsername(auth.getName());
        if (found.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Account not found"));
        }
        User user = found.get();

        String symbol = req.symbol() == null ? "" : req.symbol().trim().toUpperCase();
        if (!ALLOWED_SYMBOLS.contains(symbol)) {
            return ResponseEntity.badRequest().body(Map.of("error", "That stock is not tracked"));
        }

        String direction = req.direction() == null ? "" : req.direction().trim().toUpperCase();
        if (!direction.equals("UP") && !direction.equals("DOWN")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Direction must be UP or DOWN"));
        }

        LocalDate targetDate = nextTradingDay(LocalDate.now());

        // the unique constraint would catch this too, but a clear message is better than a 500
        if (predictionRepository
                .findByUserIdAndSymbolAndTargetDate(user.getId(), symbol, targetDate)
                .isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "You already made a call on " + symbol + " for " + targetDate));
        }

        UserPrediction prediction = new UserPrediction();
        prediction.setUserId(user.getId());
        prediction.setUsername(user.getUsername());
        prediction.setSymbol(symbol);
        prediction.setTargetDate(targetDate);
        prediction.setDirection(direction);

        return ResponseEntity.ok(predictionRepository.save(prediction));
    }

    @GetMapping
    public ResponseEntity<?> myPredictions(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sign in to see your predictions"));
        }

        List<UserPrediction> all =
                predictionRepository.findByUsernameOrderByTargetDateDesc(auth.getName());

        long scored = all.stream().filter(p -> p.getWasCorrect() != null).count();
        long correct = all.stream().filter(p -> Boolean.TRUE.equals(p.getWasCorrect())).count();

        return ResponseEntity.ok(Map.of(
                "username", auth.getName(),
                "total", all.size(),
                "scored", scored,
                "correct", correct,
                "accuracy", scored > 0 ? (double) correct / scored : null,
                "predictions", all
        ));
    }

    /** Skips weekends. Market holidays are not handled yet. */
    private LocalDate nextTradingDay(LocalDate from) {
        LocalDate d = from.plusDays(1);
        while (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
            d = d.plusDays(1);
        }
        return d;
    }
}