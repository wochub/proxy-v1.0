"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var puppeteer_1 = require("puppeteer");
var app = (0, express_1.default)();
var PORT = process.env.PORT || 3000;
// Serve static front-end files
app.use(express_1.default.static("public"));
// Browse endpoint
app.get("/browse", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var url, browser, page, content, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = req.query.url;
                if (!url) {
                    return [2 /*return*/, res.status(400).send("Missing 'url' query parameter")];
                }
                // Normalize URL
                if (!/^https?:\/\//i.test(url)) {
                    url = "https://" + url;
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, puppeteer_1.default.launch({
                        headless: true,
                        args: ["--no-sandbox", "--disable-setuid-sandbox"]
                    })];
            case 2:
                browser = _a.sent();
                return [4 /*yield*/, browser.newPage()];
            case 3:
                page = _a.sent();
                return [4 /*yield*/, page.goto(url, { waitUntil: "networkidle2" })];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.content()];
            case 5:
                content = _a.sent();
                return [4 /*yield*/, browser.close()];
            case 6:
                _a.sent();
                res.send(content);
                return [3 /*break*/, 8];
            case 7:
                err_1 = _a.sent();
                console.error("Puppeteer error:", err_1);
                res.status(500).send("Error loading page");
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
app.listen(PORT, function () {
    console.log("Server running at http://localhost:".concat(PORT));
});
