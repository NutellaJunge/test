var Service, Characteristic;
var request = require('request');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-advanced-http-temperature-humidity", "AdvancedHttpTemperatureHumidity", AdvancedHttpTemperatureHumidity);
}

function AdvancedHttpTemperatureHumidity(log, config) {
    this.log = log;
    this.humidityService = false;

    // Config
    this.url = config["url"];
    this.callspeed = config["callspeed"] || 1;
    this.http_method = config["http_method"] || "GET";
    this.sendimmediately = config["sendimmediately"] || false;
    this.username = config["username"] || "";
    this.password = config["password"] || "";

    this.name = config["name"];

    this.manufacturer = config["manufacturer"] || "HttpTemperatureHumidity";
    this.model = config["model"] || "Default";
    this.serial = config["serial"] || "18981898";

    this.disableHumidity = config["disableHumidity"] || false;
	
    this.temperatureService = new Service.TemperatureSensor(this.name);
}

AdvancedHttpTemperatureHumidity.prototype = {

    httpRequest: function (url, body, method, username, password, sendimmediately, callback) {
        request({
                url: url,
                body: body,
                method: method,
                rejectUnauthorized: false,
                auth: {
                    user: username,
                    pass: password,
                    sendImmediately: sendimmediately
                }
            },
            function (error, response, body) {
		try {
                	callback(error, response, body)
		} catch(e) {
			
		}
            })
    },

    getStateHumidity: function (callback) {
        callback(null, this.humidity);
    },

    getState: function (callback) {
        this.httpRequest(this.url, "", this.http_method, this.username, this.password, this.sendimmediately, function (error, response, responseBody) {

            if (error) {
		this.log('Get Temperature failed: %s', error.message);
		callback(error);
            } else {
		if (responseBody !== "") {
			var info = JSON.parse(responseBody);

			var temperature = parseFloat(info.temperature);
			this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(temperature);

			if (this.humidityService !== false) {
			    var humidity = parseFloat(info.humidity)

			    this.humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
			    this.humidity = humidity;
			}

			callback();
		}
		callback()
            }
        }.bind(this));
    },

    identify: function (callback) {
        callback();
    },

    getServices: function () {
        var services = [],
            informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);
        services.push(informationService);

        
        this.temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getState.bind(this));
        services.push(this.temperatureService);
        
	this.getState(function () {});    
	
        setInterval(function () {
		  this.getState(function () {})
		}.bind(this), this.callspeed*1000);
	    this.log(this.callspeed);

        if (this.disableHumidity !== true) {
            this.humidityService = new Service.HumiditySensor(this.name);
            this.humidityService
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .setProps({minValue: 0, maxValue: 100})
                .on('get', this.getStateHumidity.bind(this));
            services.push(this.humidityService);
	}

        return services;
    }
};
