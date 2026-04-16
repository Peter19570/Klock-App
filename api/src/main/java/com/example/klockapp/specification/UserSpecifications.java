package com.example.klockapp.specification;

import com.example.klockapp.filter.UserFilter;
import com.example.klockapp.model.User;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class UserSpecifications {

    public static Specification<User> withFilter(UserFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getEmail() != null) {
                predicates.add(cb.like(cb.lower(root.get("email")), "%" + filter.getEmail().toLowerCase() + "%"));
            }
            if (filter.getFullName() != null) {
                predicates.add(cb.like(cb.lower(root.get("fullName")), "%" + filter.getFullName().toLowerCase() + "%"));
            }
            if (filter.getRole() != null) {
                predicates.add(cb.equal(root.get("role"), filter.getRole()));
            }
            if (filter.getHomeBranchId() != null) {
                predicates.add(cb.equal(root.get("homeBranch").get("id"), filter.getHomeBranchId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
