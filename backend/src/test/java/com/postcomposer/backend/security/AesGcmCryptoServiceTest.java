package com.postcomposer.backend.security;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class AesGcmCryptoServiceTest {

    private final AesGcmCryptoService cryptoService = new AesGcmCryptoService(
            Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef".getBytes())
    );

    @Test
    void encryptAndDecryptRoundTripProducesOriginalPlaintext() {
        String rawToken = "ig_oauth_token_secret_987654321";
        String ciphertext1 = cryptoService.encrypt(rawToken);
        String ciphertext2 = cryptoService.encrypt(rawToken);

        // Random 96-bit IV guarantees distinct ciphertexts for identical plaintexts
        assertThat(ciphertext1).isNotEqualTo(ciphertext2);
        assertThat(ciphertext1).doesNotContain(rawToken);

        assertThat(cryptoService.decrypt(ciphertext1)).isEqualTo(rawToken);
        assertThat(cryptoService.decrypt(ciphertext2)).isEqualTo(rawToken);
    }
}
