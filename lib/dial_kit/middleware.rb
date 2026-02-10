# frozen_string_literal: true

module DialKit
  class Middleware
    CLOSING_BODY_TAG = "</body>"

    def initialize(app)
      @app = app
    end

    def call(env)
      status, headers, response = @app.call(env)

      return [status, headers, response] unless DialKit.enabled?
      return [status, headers, response] unless injectable?(headers, response)

      body = read_body(response)
      return [status, headers, response] unless body.include?(CLOSING_BODY_TAG)

      modified = body.sub(CLOSING_BODY_TAG, "#{injection_html}#{CLOSING_BODY_TAG}")
      headers = update_content_length(headers, modified)

      [status, headers, [modified]]
    end

    private

    def injectable?(headers, _response)
      content_type = headers["Content-Type"] || headers["content-type"]
      content_type&.include?("text/html")
    end

    def read_body(response)
      body = +""
      response.each { |part| body << part }
      body
    end

    def update_content_length(headers, body)
      headers = headers.dup
      headers["Content-Length"] = body.bytesize.to_s if headers["Content-Length"]
      headers
    end

    def injection_html
      <<~HTML
        <link rel="stylesheet" href="/dial_kit/dial_kit.css" data-dial-kit-asset>
        <script src="/dial_kit/dial_kit.js" data-dial-kit-asset data-dial-kit-config="#{escaped_config}"></script>
      HTML
    end

    def escaped_config
      config_json.gsub("&", "&amp;").gsub('"', "&quot;")
    end

    def config_json
      cfg = DialKit.configuration
      {
        keyboardShortcut: cfg.keyboard_shortcut,
        position: cfg.position,
        zIndex: cfg.z_index,
      }.to_json
    end
  end
end
