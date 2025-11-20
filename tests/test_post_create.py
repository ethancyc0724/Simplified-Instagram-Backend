def test_create_post_success(client):
    headers = {"Authorization": "Bearer dummy"}
    files = [
        ("images", ("a.jpg", b"fakebytes", "image/jpeg")),
        ("images", ("b.jpg", b"fakebytes", "image/jpeg"))
    ]
    data = {"content": "hello world"}
    r = client.post("/api/posts/", headers=headers, files=files, data=data)
    assert r.status_code == 200
    assert r.json()["data"]["post_id"] == "p1"
