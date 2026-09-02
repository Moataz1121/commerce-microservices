<?php

namespace App\Services;

use App\Messaging\RabbitMQPublisher;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuthService
{
    public function __construct(
        protected RabbitMQPublisher $publisher
    ) {}

    /**
     * Register a new user.
     *
     * @param array{name: string, email: string, password: string} $data
     * @return User
     */
    public function register(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        $this->publisher->publish('commerce_events', 'user.registered', [
            'eventId' => Str::uuid()->toString(),
            'event' => 'user.registered',
            'version' => 1,
            'data' => [
                'userId' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
            ],
        ]);

        return $user;
    }

    /**
     * Authenticate user and issue JWT access token.
     *
     * @param array{email: string, password: string} $credentials
     * @return array{token: string, token_type: string, user: array{id: mixed, email: string}}|null
     */
    public function login(array $credentials): ?array
    {
        $token = Auth::guard('api')->attempt($credentials);

        if (!$token) {
            return null;
        }

        /** @var User $user */
        $user = Auth::guard('api')->user();

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
            ],
        ];
    }

    /**
     * Get authenticated user profile.
     *
     * @return User|null
     */
    public function me(): ?User
    {
        /** @var User|null $user */
        $user = Auth::guard('api')->user();

        return $user;
    }

    /**
     * Invalidate current user JWT token.
     *
     * @return void
     */
    public function logout(): void
    {
        Auth::guard('api')->logout();
    }
}

