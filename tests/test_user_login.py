def test_login_success(client):
    payload = {"email":"user@example.com", "password":"pass"}
    r = client.post("/api/users/login", json = payload)
    assert r.status_code == 200
    body = r.json()["data"]
    assert "token" in body
    assert body["user"]["email"] == "user@example.com"
    assert body["user"]["username"] == "user"
    assert body["user"]["role"] == "user"

def test_login_bad_pass(client):
    payload = {"email":"user@example.com", "password":"badpass"}
    r = client.post("/api/users/login", json = payload)
    assert r.status_code == 400
    body = r.json()["detail"]
    assert body == "Invalid email or password."

