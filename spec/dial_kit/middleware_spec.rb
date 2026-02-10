# frozen_string_literal: true

require "spec_helper"
require "rack/test"

RSpec.describe DialKit::Middleware do
  include Rack::Test::Methods

  def inner_app(body: "<html><body><p>Hello</p></body></html>", content_type: "text/html")
    lambda do |_env|
      [200, { "Content-Type" => content_type }, [body]]
    end
  end

  def app(body: "<html><body><p>Hello</p></body></html>", content_type: "text/html")
    described_class.new(inner_app(body: body, content_type: content_type))
  end

  before do
    allow(DialKit).to receive(:enabled?).and_return(true)
    allow(DialKit).to receive(:configuration).and_return(DialKit::Configuration.new)
  end

  describe "HTML injection" do
    it "injects script and stylesheet before </body>" do
      status, _headers, body = app.call({})
      html = body.first

      expect(status).to eq(200)
      expect(html).to include('<link rel="stylesheet" href="/dial_kit/dial_kit.css"')
      expect(html).to include('<script src="/dial_kit/dial_kit.js"')
      expect(html).to include("</body>")
    end

    it "includes configuration as data attribute on script tag" do
      status, _headers, body = app.call({})
      html = body.first

      expect(status).to eq(200)
      expect(html).to include("data-dial-kit-config=")
      expect(html).to include("keyboardShortcut")
      expect(html).to include("ctrl+shift+d")
    end

    it "preserves original body content" do
      _status, _headers, body = app.call({})
      html = body.first

      expect(html).to include("<p>Hello</p>")
    end
  end

  describe "non-HTML responses" do
    it "does not inject into JSON responses" do
      _status, _headers, body = app(content_type: "application/json", body: '{"ok":true}').call({})

      expect(body.first).to eq('{"ok":true}')
    end

    it "does not inject into responses without </body>" do
      _status, _headers, body = app(body: "<p>fragment</p>").call({})

      expect(body.first).to eq("<p>fragment</p>")
    end
  end

  describe "Content-Length" do
    it "updates Content-Length when present" do
      inner = lambda do |_env|
        body = "<html><body></body></html>"
        [200, { "Content-Type" => "text/html", "Content-Length" => body.bytesize.to_s }, [body]]
      end

      _status, headers, body = described_class.new(inner).call({})

      expect(headers["Content-Length"].to_i).to eq(body.first.bytesize)
    end
  end
end
