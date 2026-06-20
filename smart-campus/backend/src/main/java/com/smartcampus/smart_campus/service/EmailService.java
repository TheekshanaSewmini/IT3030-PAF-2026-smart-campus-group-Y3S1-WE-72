package com.smartcampus.smart_campus.service;

import com.smartcampus.smart_campus.records.MailBody;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService{


    private final JavaMailSender javaMailSender;
    private final String fromAddress;


    public EmailService(JavaMailSender javaMailSender, @Value("${spring.mail.username:}") String fromAddress) {
        this.javaMailSender = javaMailSender;
        this.fromAddress = fromAddress;
    }

    public  void sendSimpleMessasge(MailBody mailBody){


        SimpleMailMessage message= new SimpleMailMessage();
        message.setTo(mailBody.to());
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setSubject(mailBody.subject());
        message.setText(mailBody.text());


        javaMailSender.send(message);
    }
}


