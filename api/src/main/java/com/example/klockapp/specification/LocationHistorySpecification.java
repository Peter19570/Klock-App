package com.example.klockapp.specification;

import com.example.klockapp.filter.LocationHistoryFilter;
import com.example.klockapp.model.WorkSession;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class LocationHistorySpecification {

    public static Specification<WorkSession> withFilter(LocationHistoryFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getMinWorkDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("workDate"), filter.getMinWorkDate()));
            }
            if (filter.getMaxWorkDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("workDate"), filter.getMaxWorkDate()));
            }
            if (filter.getUserId() != null) {
                predicates.add(cb.equal(root.get("user").get("id"), filter.getUserId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
