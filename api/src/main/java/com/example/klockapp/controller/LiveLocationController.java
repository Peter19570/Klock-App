package com.example.klockapp.controller;

import com.example.klockapp.dto.request.LiveLocationRequest;
import com.example.klockapp.dto.response.LiveLocationResponse;
import com.example.klockapp.service.LiveLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class LiveLocationController {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final LiveLocationService liveLocationService;

    @MessageMapping("/send-location")
    public void broadcastLocation(Principal principal, LiveLocationRequest request){
        if (principal == null || request == null){
            return;
        }
        LiveLocationResponse response = liveLocationService.broadcastLocation(principal, request);

        simpMessagingTemplate.convertAndSend("/topic/admin-map", response);
    }
}
