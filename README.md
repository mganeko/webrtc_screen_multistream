# はじめに

このレポジトリは、[WebRTC Beginners Tokyo](https://webrtc.connpass.com) が開催する、WebRTCハンズオン勉強会用のサンプルです。

- [WebRTC ハンズオン ScreenCapture ＆ マルチストリーム編
(https://qiita.com/massie_g/items/f852680b16c1b14cb9e8)

# 動かし方

- [WebRTCハンズオン 本編](https://qiita.com/yusuke84/items/43a20e3b6c78ae9a8f6c#step3)のシグナリングサーバーを起動
    - コード：GitHubのbranch_step3 [webrtc-handson-2016/server/signaling.js](https://github.com/yusuke84/webrtc-handson-2016/blob/handson_step3/server/signaling.js)
- クライアント用のコードを、ローカルにダウンロード(git cloneや、zipでダウンロード）
    - コード： GitHub [mganeko/webrtc_screen_multistream](https://github.com/mganeko/webrtc_screen_multistream)
- ローカルWebサーバーのフォルダーに配置
- 2つのブラウザで screen.html を開く
- 両方のブラウザで、[Start Video]ボタンをクリック
- 片方のブラウザで、[Connect]ボタンをクリック
    - → P2P通信が確立し、片方の映像がもう一方のブラウザに表示される
- 片方のブラウザで、[Add Screen]ボタンをクリック
    - スクリーン全体、ウィンドウを選択する
    - → キャプチャーが始まり、もう一方のブラウザに表示される
- [Remove Screen]ボタンをクリックすると、キャプチャーが終了する

# License

- MIT License
