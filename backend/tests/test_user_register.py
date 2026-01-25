def test_user_register_success(client):
    payload = {
        "email": "user@example.com",
        "username": "user",
        "password": "123456789"
    }
    resp = client.post("/api/users/register", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["message"] == "ok"
    assert "token" in body["data"]
    assert body["data"]["user"]["email"] == "user@example.com"
    assert body["data"]["user"]["username"] == "user"



