var worlds, init;

var worldNames = {
	1: 'Connery',
	10: 'Miller',
	13: 'Cobalt',
	17: 'Emerald',
	25: 'Briggs'
};

var zoneNames = {
	2: 'Indar',
	4: 'Hossin',
	6: 'Amerish',
	8: 'Esamir'
};

var factionAbbrevs = [
	'vs',
	'nc',
	'tr'
];

var updateTime = function(){
	var now = Date.now();

	for(var id in worlds){
		var alert = worlds[id].alert;
		if(alert.active){
			var maxDuration = 2; // hours
			if(alert.specialEventID)
				maxDuration = 1;

			var date = new Date(alert.start - now);
			date.setUTCHours(date.getUTCHours() + maxDuration);

			var h = date.getUTCHours();
			var m = ('0' + date.getUTCMinutes()).slice(-2);
			var s = ('0' + date.getUTCSeconds()).slice(-2);

			if(h > maxDuration || (h + +m + +s) < 0){
				alert.active = false;
				updateAlert(id, alert);
			} else
				$('#world-' + id + ' .state').html(h + ':' + m + ':' + s);
		}
	}
};

var updateDetails = function(id, details){
	var field = $('#world-' + id + ' .details');
	field.html('');

	var alert = worlds[id].alert;
	if(!alert.active)
		return;

	if(alert.specialEventID){
		var description;
		if(alert.specialEventID >= 51 && alert.specialEventID <= 54)
			description = 'Pumpkin hunt!';
		else
			description = 'Unknown event';

		$('<span>' + description + '</span>').appendTo(field);
	} else {
		var total = details[1].length + details[2].length + details[3].length;
		for(var factionId in details){
			var percentage = (details[factionId].length / total) * 100;

			$('<div></div>', {
				class: factionAbbrevs[factionId - 1],
				'data-title': Math.round(percentage) + '%'
			}).css('width', (216 * percentage) / 100 + 'px').appendTo(field);
		}
	}
};

var updateState = function(id){
	var state = worlds[id].state;
	state = state == 'online' ? 'no alert' : state;

	$('#world-' + id + ' .state').html(state.charAt(0).toUpperCase() + state.slice(1));
}

var updateAlert = function(id, alert){
	var schema = '#world-' + id;
	if(alert.active){
		$(schema).addClass('active');
		$(schema + ' .state').html('Active alert!');
		$(schema + ' .zone').html(zoneNames[alert.zone]);

		updateTime();
		updateDetails(id, worlds[id].details);
	} else {
		$(schema).removeClass();
		$(schema + ' .zone').html('');
		$(schema + ' .details').html('');

		updateState(id);
	}
};

var processData = function(data){
	if(data.worlds){
		worlds = data.worlds;

		if(!init){
			init = true;

			var array = [];
			for(var id in worlds)
				array.push({name: worldNames[id], id: id});

			array.sort(function(a, b){
				return a.name > b.name;
			});

			for(var index in array){
				var item = array[index];
				$('table').append('<tr id="world-' + item.id + '"></tr>');
				$('tr:last').append('<td>' + item.name + '</td>');
				$('tr:last').append('<td class="state"></td>');
				$('tr:last').append('<td class="zone"></td>');
				$('tr:last').append('<td class="details"></td>');

				var world = worlds[item.id];
				updateAlert(item.id, world.alert);

				if(world.alert.active)
					updateDetails(item.id, world.details);
			}
		} else {
			for(var id in worlds){
				var world = worlds[id];
				updateAlert(id, world.alert);

				if(world.alert.active)
					updateDetails(id, world.details);
			}
		}
	} else if(data.state){
		worlds[data.id].state = data.state;
		updateState(data.id);
	} else if(data.alert){
		worlds[data.id].alert = data.alert;
		updateAlert(data.id, data.alert);
	} else if(data.details)
		updateDetails(data.id, data.details);
};

var interval;
var connect = function(url){
	var socket = new WebSocket(url);
	socket.onmessage = function(event){
		if(event.data == 'ping')
			socket.send('pong');
		else
			processData(JSON.parse(event.data));
	}

	socket.onopen = function(){
		if(interval){
			clearInterval(interval);
			interval = null;
		}
	}

	socket.onclose = function(){
		if(!interval){
			interval = setInterval(function(){
				connect(url);
			}, 15000);
		}
	}
};

$(document).ready(function(){
	if('WebSocket' in window){
		setInterval(updateTime, 1000);
		connect('wss://ps2-alerts.herokuapp.com');
	} else
		$('body').html('<header><h1>Your browser is too old!<br><a href="http://www.browser-update.org/update.html">Click here to learn more!</a></h1></header>');
});
