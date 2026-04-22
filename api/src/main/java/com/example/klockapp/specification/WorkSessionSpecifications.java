package com.example.klockapp.specification;

import com.example.klockapp.filter.SessionFilter;
import com.example.klockapp.model.WorkSession;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class WorkSessionSpecifications {

    public static Specification<WorkSession> withFilter(SessionFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getMinWorkDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("workDate"), filter.getMinWorkDate()));
            }
            if (filter.getMaxWorkDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("workDate"), filter.getMaxWorkDate()));
            }
            if (filter.getSessionStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getSessionStatus()));
            }
            if (filter.getUserId() != null) {
                predicates.add(cb.equal(root.get("user").get("id"), filter.getUserId()));
            }
            // Join with ClockEvents to filter by branch movements
            if (filter.getBranchId() != null) {
                predicates.add(cb.equal(root.join("clockEvents")
                        .get("branch").get("id"), filter.getBranchId()));
            }

            if (filter.getArrivalStatus() != null){
                predicates.add(cb.equal(root.get("arrivalStatus"), filter.getArrivalStatus()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
