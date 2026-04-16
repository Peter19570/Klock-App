package com.example.klockapp.config.cloudinary;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.klockapp.dto.internal.CloudinaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryResponse upload(MultipartFile file) throws IOException {
        Map<String, Object> response = cloudinary.uploader().upload(file.getBytes(),
                ObjectUtils.asMap("folder", "user_pictures"));

        String publicId = String.valueOf(response.get("public_id"));
        String url = String.valueOf(response.get("secure_url"));

        return new CloudinaryResponse(publicId, url);
    }

    public void delete(String publicId) throws IOException {
        Map<String, Object> response = cloudinary.uploader().destroy(publicId,
                ObjectUtils.asMap());
    }
}
