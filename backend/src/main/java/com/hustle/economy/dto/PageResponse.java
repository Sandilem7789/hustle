package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** One page of a list, in the same shape as SalesPageResponse. */
@Getter
@Builder
public class PageResponse<T> {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    /** Cuts one page out of an already filtered list; a missing page or size takes the default. */
    public static <T> PageResponse<T> of(List<T> all, Integer page, Integer size) {
        int p = page != null ? page : 0;
        int s = size != null ? size : DEFAULT_SIZE;
        if (p < 0 || s < 1 || s > MAX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "page must be 0 or more and size between 1 and " + MAX_SIZE);
        }
        int from = (int) Math.min((long) p * s, all.size());
        int to = Math.min(from + s, all.size());
        return PageResponse.<T>builder()
                .content(all.subList(from, to))
                .page(p)
                .size(s)
                .totalElements(all.size())
                .totalPages((all.size() + s - 1) / s)
                .build();
    }
}
