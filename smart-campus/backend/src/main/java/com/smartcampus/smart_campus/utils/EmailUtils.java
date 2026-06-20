package com.smartcampus.smart_campus.utils;

import com.smartcampus.smart_campus.records.MailBody;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class EmailUtils {

    private final JavaMailSender javaMailSender;
    private final String fromAddress;

    public EmailUtils(JavaMailSender javaMailSender, @Value("${spring.mail.username}") String fromAddress) {
        this.javaMailSender = javaMailSender;
        this.fromAddress = fromAddress;
    }

    // Send HTML email using configured mail sender
    public void sendMail(MailBody mailBody) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(mailBody.to());
            helper.setFrom(fromAddress);
            helper.setSubject(mailBody.subject());
            helper.setText(mailBody.text(), true);

            javaMailSender.send(message);

            log.info("Email sent successfully to {}", mailBody.to());

        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", mailBody.to(), e.getMessage());
            throw new RuntimeException("Email sending failed", e);
        }
    }
}
