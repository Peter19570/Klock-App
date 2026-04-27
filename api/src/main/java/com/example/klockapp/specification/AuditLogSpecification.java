package com.example.klockapp.specification;

import com.example.klockapp.filter.AuditLogFilter;
import com.example.klockapp.filter.LocationHistoryFilter;
import com.example.klockapp.model.AuditLog;
import com.example.klockapp.model.LocationHistory;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class AuditLogSpecification {

    public static Specification<AuditLog> withFilter(AuditLogFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getMinCreatedAt() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.getMinCreatedAt()));
            }
            if (filter.getMaxCreatedAt() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.getMaxCreatedAt()));
            }
            if (filter.getAuditOption() != null) {
                predicates.add(cb.equal(root.get("type"), filter.getAuditOption()));
            }
            if (filter.getUserId() != null) {
                predicates.add(cb.equal(root.get("userId"), filter.getUserId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
