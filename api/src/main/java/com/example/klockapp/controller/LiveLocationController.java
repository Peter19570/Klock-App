package com.example.klockapp.controller;

import com.example.klockapp.dto.request.LiveLocationRequest;
import com.example.klockapp.dto.response.LiveLocationResponse;
import com.example.klockapp.service.LiveLocationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Tag(name = "Live Location")
public class LiveLocationController {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final LiveLocationService liveLocationService;

    /**
     * WebSocket endpoint where users send data, which is then broadcast to subscribed admins in real time.
     * */
    @MessageMapping("/send-location")
    public void broadcastLocation(@AuthenticationPrincipal Principal principal, LiveLocationRequest request){
        if (principal == null || request == null){
            return;
        }
        LiveLocationResponse response = liveLocationService.broadcastLocation(principal, request);

        simpMessagingTemplate.convertAndSend("/topic/admin-map", response);
    }
}
