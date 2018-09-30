#!/bin/bash

curl -X POST -H "Content-Type: application/json" -d @settingsFbChatBot.json "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=EAAIPW5aOST0BAF6lyJNV1K1H2ska9HVgRqs2iWq4hJPuyCCESaBpLeK1OkqnZBN8hFfsHI5HNJGfYNzQyXcIaTvt1dMXECLrfa2uryqgK0jgWXUnye47SnbhKiacXY3IiKNWaOFdWdLnlwFPrrL2DVI17uahynlxxR2DNUwZDZD" -o esitoSettingsFbChatBot.txt