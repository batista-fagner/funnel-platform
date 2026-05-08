import { Controller, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Controller('instagram')
export class InstagramProxyController {
  private readonly rapidapiKey: string;
  private readonly rapidapiHost: string;

  constructor(private config: ConfigService) {
    this.rapidapiKey = config.get('RAPIDAPI_KEY') || '';
    this.rapidapiHost = config.get('RAPIDAPI_HOST') || 'instagram120.p.rapidapi.com';
  }

  @Post('profile')
  async getProfile(@Body() body: { username: string }) {
    const headers = {
      'x-rapidapi-key': this.rapidapiKey,
      'x-rapidapi-host': this.rapidapiHost,
      'Content-Type': 'application/json',
    };

    try {
      const res = await axios.post(`https://${this.rapidapiHost}/api/instagram/profile`, body, { headers });
      return res.data;
    } catch {
      // fallback
    }

    const res = await axios.post(`https://${this.rapidapiHost}/api/instagram/userInfo`, body, { headers });
    return res.data;
  }
}
