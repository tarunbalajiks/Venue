package com.venuesug.pkg.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.venuesug.pkg.models.VSUser;

public interface UserRepository extends JpaRepository<VSUser, Long> {
	Optional<VSUser> findByUsername(String username);
}