import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CookieOptions, Request, Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AuthenticatedUser } from "../common/types/authenticated-user.type";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Register a customer account" })
  async register(@Body() dto: RegisterDto): Promise<void> {
    await this.auth.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Log in and set a rotating refresh-token cookie" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.completeSession(await this.auth.login(dto), response);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  @ApiCookieAuth("refresh_token")
  @ApiOperation({
    summary: "Rotate refresh token and issue a new access token",
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.completeSession(
      await this.auth.refresh(
        request.cookies?.refresh_token as string | undefined,
      ),
      response,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(user.id);
    response.clearCookie("refresh_token", this.refreshCookieOptions());
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  private completeSession(
    session: Awaited<ReturnType<AuthService["login"]>>,
    response: Response,
  ) {
    response.cookie("refresh_token", session.refreshToken, {
      ...this.refreshCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: session.accessToken, user: session.user };
  }

  private refreshCookieOptions(): CookieOptions {
    const secure = this.config.get<boolean>("COOKIE_SECURE", false);

    return {
      httpOnly: true,
      secure,
      sameSite: secure ? "none" : "lax",
      path: "/api/v1/auth",
    };
  }
}
