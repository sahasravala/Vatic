package com.vatic;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HistoricalPriceRepository
        extends JpaRepository<HistoricalPrice, Long> {

    List<HistoricalPrice> findBySymbolOrderByDateDesc(String symbol);

    Optional<HistoricalPrice> findBySymbolAndDate(
            String symbol,
            LocalDate date
    );
}