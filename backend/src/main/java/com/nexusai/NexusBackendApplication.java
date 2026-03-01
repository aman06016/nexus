package com.nexusai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NexusBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexusBackendApplication.class, args);
    }
}
