package com.hustle.economy;

import com.hustle.economy.controller.UploadController;
import com.hustle.economy.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class UploadControllerTest {
    @Test
    void rejectsImageLargerThanFiveMegabytesBeforeStoringIt() throws Exception {
        UploadController controller = new UploadController(mock(AuthService.class));
        MockMultipartFile file = new MockMultipartFile(
                "file", "large.jpg", "image/jpeg", new byte[5 * 1024 * 1024 + 1]);

        var response = controller.upload("test-token", file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("error", "Images must be 5 MB or smaller");
    }
}
