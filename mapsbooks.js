// -------------------
// API-ключи для Yandex.Maps
// -------------------
var apiKeys = [
	"497a3d94-fb7f-49b4-aa42-41f4070296b2",
	"d834feee-f868-4295-b1cb-9583b7e752ae",
	"dcbc2cfe-e689-40e0-b774-a1dad7c06072",
	"80b6fdc3-2eb5-468c-9bda-2da6ec1bc28d",
	"22b3d697-29a7-4476-9e04-bc07350efe18"
];
var loadCount = parseInt(localStorage.getItem("ymapsLoadCount") || "0", 10);
loadCount++;
localStorage.setItem("ymapsLoadCount", loadCount);
var keyIndex = Math.floor(loadCount / 40) % apiKeys.length,
	currentApiKey = apiKeys[keyIndex];
console.log("Yandex.Maps API key: " + currentApiKey + " (load #" + loadCount + ")");

var ymapsScript = document.createElement("script");
ymapsScript.type = "text/javascript";
ymapsScript.src = "https://api-maps.yandex.ru/2.1/?apikey=" + currentApiKey + "&lang=ru_RU";
document.head.appendChild(ymapsScript);

// -------------------
// Запускаем процесс получения данных только после загрузки DOM
// и используем кэширование
// -------------------
document.addEventListener("DOMContentLoaded", function () {
	var cachedData = localStorage.getItem("mapsDataCache");
	if (cachedData) {
		console.log("Using cached maps data.");
		window.processData(JSON.parse(cachedData));
	} else {
		console.log("No cached maps data found. Loading new data.");
		var script = document.createElement("script");
		script.src = "https://script.google.com/macros/s/AKfycbygqZUSoTfTY-YxfHU6vASmhS_6UTQ4biNU1H5B6ptfbVDHyWWGEs7_91TjpQcc3hLUwg/exec?callback=processData";
		document.head.appendChild(script);
	}
});

// -------------------
// Функция сортировки точек по названию
// -------------------
function comparePoints(a, b) {
	var nameA = (a.Name || "").trim();
	var nameB = (b.Name || "").trim();
	return nameA.localeCompare(nameB, 'ru', { sensitivity: 'base' });
}

// -------------------
// Функция, вызываемая при получении данных (JSONP)
// -------------------
window.processData = function (data) {
	console.log('Получены данные:', data);

	// Сохраняем данные в кэш (localStorage)
	try {
		localStorage.setItem("mapsDataCache", JSON.stringify(data));
	} catch (e) {
		console.warn("Ошибка кэширования данных:", e);
	}

	// Сортировка: страны по алфавиту и внутри каждой страны точки по названию
	var sortedData = {};
	var sortedCountries = Object.keys(data).sort(function (a, b) {
		return a.localeCompare(b);
	});
	sortedCountries.forEach(function (country) {
		var items = data[country];
		if (Array.isArray(items)) {
			items.sort(comparePoints);
		}
		sortedData[country] = items;
	});
	data = sortedData;

	ymaps.ready(function () {
		var myMap = new ymaps.Map("map", {
			center: [50.02788623019044, 19.944986789507716],
			zoom: 5
		});

		// -------------------
		// Переменные для фильтров и элементы DOM
		// -------------------
		var selectedCountry = null,
			selectedCity = null,
			countryListWrapper = document.querySelector(".country-list-wrapper-include"),
			cityListWrapper = document.querySelector(".city-list-wrapper-include"),
			countryListContainer = document.querySelector(".country-list"),
			cityListContainer = document.querySelector(".city-list"),
			markerListWrapper = document.querySelector(".maps-marker-list-wrapper"),
			countryTriggerTextWrapper = document.querySelector(".country-trigger-text-wrapper"),
			cityTriggerTextWrapper = document.querySelector(".city-trigger-text-wrapper"),
			countryTriggerTextEl = countryTriggerTextWrapper ? countryTriggerTextWrapper.querySelector(".country-list-trigger-text") : null,
			cityTriggerTextEl = cityTriggerTextWrapper ? cityTriggerTextWrapper.querySelector(".city-list-trigger-text") : null,
			countryTriggerNumberEl = document.querySelector(".country-list-trigger-number"),
			cityTriggerNumberEl = document.querySelector(".city-list-trigger-number"),
			defaultCountryTriggerText = countryTriggerTextEl ? countryTriggerTextEl.textContent : "Страна",
			defaultCityTriggerText = cityTriggerTextEl ? cityTriggerTextEl.textContent : "Город",
			countries = Object.keys(data);

		// -------------------
		// Функции обновления списков фильтров
		// -------------------
		function updateCountryFilterList() {
			if (!countryListWrapper) return;
			countryListWrapper.innerHTML = "";
			if (selectedCountry) {
				var allCountriesItem = document.createElement("a");
				allCountriesItem.href = "#";
				allCountriesItem.className = "country-list-item all-countries";
				allCountriesItem.innerHTML = '<div class="country-list-header"><h4 class="country-text-header">Все страны</h4></div>';
				allCountriesItem.addEventListener("click", function (evt) {
					evt.preventDefault();
					selectedCountry = null;
					selectedCity = null;
					updateMap();
					if (countryListContainer) countryListContainer.classList.remove("open");
					var countryTriggerEl = document.querySelector(".country-trigger");
					if (countryTriggerEl) countryTriggerEl.classList.remove("open");
				});
				countryListWrapper.appendChild(allCountriesItem);
			}
			countries.forEach(function (country) {
				var countryItem = document.createElement("a");
				countryItem.href = "#";
				countryItem.className = "country-list-item w-inline-block";
				if (selectedCountry === country) {
					countryItem.style.backgroundColor = "#E8E8E8";
				}
				countryItem.innerHTML = '<div class="country-list-header"><img src="https://flagcdn.com/24x18/' + getCountryCode(country) + '.png" loading="lazy" alt="" class="image-country"><h4 class="country-text-header">' + country + "</h4></div>";
				countryItem.addEventListener("click", function (evt) {
					evt.preventDefault();
					if (selectedCountry === country) {
						selectedCountry = null;
					} else {
						selectedCountry = country;
						selectedCity = null;
					}
					updateMap();
					if (countryListContainer) countryListContainer.classList.remove("open");
					var countryTriggerEl = document.querySelector(".country-trigger");
					if (countryTriggerEl) countryTriggerEl.classList.remove("open");
				});
				countryListWrapper.appendChild(countryItem);
			});
			if (countryTriggerNumberEl) {
				if (selectedCountry) {
					countryTriggerNumberEl.style.display = "none";
				} else {
					countryTriggerNumberEl.style.display = "block";
					countryTriggerNumberEl.textContent = "(" + countryListWrapper.childElementCount + ")";
				}
			}
		}

		function updateCityFilterList() {
			if (!cityListWrapper) return;
			cityListWrapper.innerHTML = "";
			if (selectedCity) {
				var allCitiesItem = document.createElement("a");
				allCitiesItem.href = "#";
				allCitiesItem.className = "city-list-item all-cities";
				allCitiesItem.innerHTML = '<div class="city-list-header"><h4 class="city-text-header">Все города</h4></div>';
				allCitiesItem.addEventListener("click", function (evt) {
					evt.preventDefault();
					selectedCity = null;
					updateMap();
					if (cityListContainer) cityListContainer.classList.remove("open");
					var cityTriggerEl = document.querySelector(".city-trigger");
					if (cityTriggerEl) cityTriggerEl.classList.remove("open");
				});
				cityListWrapper.appendChild(allCitiesItem);
			}
			var citySet = new Set(), cityCountryMap = {};
			if (selectedCountry && data[selectedCountry]) {
				data[selectedCountry].forEach(function (item) {
					if (item.City && item.City.trim() !== "") {
						var cityName = item.City.trim();
						citySet.add(cityName);
						cityCountryMap[cityName] = selectedCountry;
					}
				});
			} else {
				countries.forEach(function (country) {
					data[country].forEach(function (item) {
						if (item.City && item.City.trim() !== "") {
							var cityName = item.City.trim();
							citySet.add(cityName);
							if (!cityCountryMap[cityName]) {
								cityCountryMap[cityName] = item.Country || country;
							}
						}
					});
				});
			}
			Array.from(citySet).sort(function (a, b) {
				return a.localeCompare(b, 'ru', { sensitivity: 'base' });
			}).forEach(function (city) {
				var cityItem = document.createElement("a");
				cityItem.href = "#";
				cityItem.className = "city-list-item w-inline-block";
				if (selectedCity === city) {
					cityItem.style.backgroundColor = "#E8E8E8";
				}
				var flagCountry = selectedCountry ? selectedCountry : (cityCountryMap[city] || "");
				cityItem.innerHTML = '<div class="city-list-header"><img src="https://flagcdn.com/24x18/' + getCountryCode(flagCountry) + '.png" loading="lazy" alt="" class="image-country"><h4 class="city-text-header">' + city + "</h4></div>";
				cityItem.addEventListener("click", function (evt) {
					evt.preventDefault();
					if (selectedCity === city) {
						selectedCity = null;
					} else {
						selectedCity = city;
					}
					updateMap();
					if (cityListContainer) cityListContainer.classList.remove("open");
					var cityTriggerEl = document.querySelector(".city-trigger");
					if (cityTriggerEl) cityTriggerEl.classList.remove("open");
				});
				cityListWrapper.appendChild(cityItem);
			});
			if (cityTriggerNumberEl) {
				if (selectedCity) {
					cityTriggerNumberEl.style.display = "none";
				} else {
					cityTriggerNumberEl.style.display = "block";
					cityTriggerNumberEl.textContent = "(" + cityListWrapper.childElementCount + ")";
				}
			}
		}

		// -------------------
		// Обновлённая функция обновления карты и списка точек
		// -------------------
		function updateMap() {
			myMap.geoObjects.removeAll();
			markerListWrapper.innerHTML = "";
			var markerListItems = [];
			var coordsForCenter = [];

			var currentSelectedCountry = selectedCountry ? selectedCountry.trim().toLowerCase() : null;
			var currentSelectedCity = selectedCity ? selectedCity.trim().toLowerCase() : null;

			var allPoints = [];
			countries.forEach(function (countryKey) {
				if (currentSelectedCountry && countryKey.trim().toLowerCase() !== currentSelectedCountry) return;
				data[countryKey].forEach(function (item) {
					if (currentSelectedCity && (item.City || "").trim().toLowerCase() !== currentSelectedCity) return;
					allPoints.push(item);
				});
			});

			allPoints.sort(function (a, b) {
				var nameA = (a.Name || "").trim();
				var nameB = (b.Name || "").trim();
				return nameA.localeCompare(nameB, 'ru', { sensitivity: 'base' });
			});

			function sortAndRenderMarkerList() {
				markerListItems.sort(function (a, b) {
					var textA = a.querySelector('.marker-list-item-header-text') ? a.querySelector('.marker-list-item-header-text').textContent.trim().toLowerCase() : "";
					var textB = b.querySelector('.marker-list-item-header-text') ? b.querySelector('.marker-list-item-header-text').textContent.trim().toLowerCase() : "";
					return textA.localeCompare(textB, 'ru', { sensitivity: 'base' });
				});
				markerListWrapper.innerHTML = "";
				markerListItems.forEach(function (item) {
					markerListWrapper.appendChild(item);
				});
			}

			allPoints.forEach(function (item) {
				function processItem(coords) {
					if (currentSelectedCountry && (item.Country || "").trim().toLowerCase() !== currentSelectedCountry) return;
					if (currentSelectedCity && (item.City || "").trim().toLowerCase() !== currentSelectedCity) return;

					item._coords = coords;
					coordsForCenter.push(coords);

					addPlacemark(coords[0], coords[1], item);

					if (currentSelectedCountry || currentSelectedCity) {
						var markerItem = document.createElement("a");
						markerItem.href = "#";
						markerItem.className = "marker-list-item w-inline-block";
						var addressParts = [];
						if (item.Country) addressParts.push(item.Country.trim());
						if (item.City) addressParts.push(item.City.trim());
						if (item.Address) addressParts.push(item.Address.trim());
						var fullAddress = addressParts.length > 0 ? addressParts.join(', ') : "Неизвестный адрес";

						markerItem.innerHTML = `
              <div class="marker-list-item-header-wrapper"> 
                <div class="marker-list-item-header"> 
                  <img src="https://flagcdn.com/24x18/${getCountryCode(item.Country)}.png" loading="lazy" alt="" class="image-country"> 
                  <h4 class="marker-list-item-header-text">${item.Name || "Без названия"}</h4> 
                </div> 
              </div> 
              <div class="marker-list-item-adress"> 
                <div class="marker-list-item-adress-text">${fullAddress}</div> 
              </div>`;

						markerItem.addEventListener("click", function (evt) {
							evt.preventDefault();
							openModal(item);
							if (item._coords) {
								myMap.setCenter(item._coords, 18);
							}
						});

						markerListItems.push(markerItem);
						sortAndRenderMarkerList();
					}
				}

				if (item.latitude && item.longitude) {
					processItem([parseFloat(item.latitude), parseFloat(item.longitude)]);
				} else if (item.Address || item.City || item.Country) {
					var addressParts = [item.Address, item.City, item.Country].filter(Boolean).join(', ');
					ymaps.geocode(addressParts, { results: 1 }).then(function (res) {
						var firstGeoObject = res.geoObjects.get(0);
						if (firstGeoObject) {
							var coords = firstGeoObject.geometry.getCoordinates();
							processItem(coords);
						}
					});
				}
			});

			if (currentSelectedCountry || currentSelectedCity) {
				markerListWrapper.style.setProperty('background-image', 'none', 'important');
			} else {
				markerListWrapper.style.removeProperty('background-image');
			}

			updateCountryFilterList();
			updateCityFilterList();

			if (countryTriggerTextEl) {
				countryTriggerTextEl.textContent = selectedCountry || defaultCountryTriggerText;
			}
			if (cityTriggerTextEl) {
				cityTriggerTextEl.textContent = selectedCity || defaultCityTriggerText;
			}

			setTimeout(function () {
				if (coordsForCenter.length > 0) {
					var sumLat = 0, sumLon = 0;
					coordsForCenter.forEach(function (c) { sumLat += c[0]; sumLon += c[1]; });
					var avgLat = sumLat / coordsForCenter.length,
						avgLon = sumLon / coordsForCenter.length;
					myMap.setCenter([avgLat, avgLon], selectedCity ? 12 : 8);
				} else {
					myMap.setCenter([50.02788623019044, 19.944986789507716], 5);
				}
			}, 500);
		}

		// -------------------
		// Привязка событий для открытия/закрытия списков фильтров
		// -------------------
		var countryTriggerEl = document.querySelector(".country-trigger");
		if (countryTriggerEl) {
			countryTriggerEl.addEventListener("click", function () {
				if (countryListContainer) {
					countryListContainer.classList.toggle("open");
					countryTriggerEl.classList.toggle("open");
					if (countryListContainer.classList.contains("open") && cityListContainer) {
						cityListContainer.classList.remove("open");
						var tempCityTrigger = document.querySelector(".city-trigger");
						if (tempCityTrigger) tempCityTrigger.classList.remove("open");
					}
				}
			});
		}
		var cityTriggerEl = document.querySelector(".city-trigger");
		if (cityTriggerEl) {
			cityTriggerEl.addEventListener("click", function () {
				if (cityListContainer) {
					cityListContainer.classList.toggle("open");
					cityTriggerEl.classList.toggle("open");
					if (cityListContainer.classList.contains("open") && countryListContainer) {
						countryListContainer.classList.remove("open");
						var tempCountryTrigger = document.querySelector(".country-trigger");
						if (tempCountryTrigger) tempCountryTrigger.classList.remove("open");
					}
				}
			});
		}

		// -------------------
		// Функция добавления метки на карту
		// -------------------
		function addPlacemark(lat, lon, item) {
			item._coords = [lat, lon];
			var placemark = new ymaps.Placemark([lat, lon], {}, {
				iconLayout: 'default#image',
				iconImageHref: 'https://cdn.prod.website-files.com/67880ce670c80f8dc8b685a0/6793c9f35f81beee9936f319_marker.svg',
				iconImageSize: [30, 42],
				iconImageOffset: [-15, -42]
			});
			placemark.events.add('click', function () {
				openModal(item);
				myMap.setCenter([lat, lon], 18);
			});
			myMap.geoObjects.add(placemark);
		}

		// -------------------
		// Функция для получения кода страны по названию
		// -------------------
		function getCountryCode(countryName) {
			if (!countryName) return '';
			var countryCodes = {
				"Россия": "ru", "США": "us", "Германия": "de", "Франция": "fr",
				"Великобритания": "gb", "Китай": "cn", "Индия": "in", "Япония": "jp",
				"Канада": "ca", "Бразилия": "br", "Мексика": "mx", "ЮАР": "za",
				"Южная Корея": "kr", "Турция": "tr", "Аргентина": "ar", "Колумбия": "co",
				"Венесуэлла": "ve", "Перу": "pe", "Чили": "cl", "Уругвай": "uy",
				"Боливия": "bo", "Израиль": "il", "Грузия": "ge", "Беларусь": "by",
				"Армения": "am", "Узбекистан": "uz", "Эстония": "ee", "Финляндия": "fi",
				"Нидерланды": "nl", "Литва": "lt", "Молдова": "md", "Латвия": "lv",
				"Кипр": "cy", "Азербайджан": "az", "Польша": "pl", "Испания": "es",
				"Чехия": "cz", "Кыргызстан": "kg", "Казахстан": "kz", "Сербия": "rs",
				"Австралия": "au", "Австрия": "at", "Португалия": "pt", "Украина": "ua",
				"Черногория": "me", "Швеция": "se"
			};
			return countryCodes[countryName] || countryName.substring(0, 2).toLowerCase();
		}

		// -------------------
		// Функция для разбора телефонных номеров
		// -------------------
		function parsePhoneNumbers(phoneStr) {
			if (!phoneStr) return [];
			var phoneLines = phoneStr.split(/\r?\n/),
				phones = [];
			phoneLines.forEach(function (line) {
				line = line.trim();
				if (!line) return;
				var cleaned = line.replace(/[A-Za-zА-Яа-яёЁ]/g, '').trim();
				cleaned = cleaned.replace(/\s+/g, ' ');
				if (cleaned[0] !== '+') { cleaned = '+' + cleaned; }
				var phoneLink = cleaned.replace(/[^+\d]/g, '');
				phones.push({ display: cleaned, link: phoneLink });
			});
			return phones;
		}

		// -------------------
		// Функция открытия модального окна с информацией о точке
		// -------------------
		function openModal(item) {
			var modal = document.querySelector('.maps-item-content');
			modal.style.display = 'flex';
			modal.querySelector('.maps-item-content-header-text').textContent = item.Name || "Неизвестное название";

			// Обработка ссылок
			var headerLinkEl = modal.querySelector('.maps-item-content-header-link');
			if (headerLinkEl) {
				var headerLinkContainer = headerLinkEl.parentNode;
				headerLinkEl.remove();
				if (item.Link && item.Link.trim() !== "") {
					var links = item.Link.split('\n');
					links.forEach(function (link) {
						link = link.trim();
						if (!link) return;
						var a = document.createElement("a");
						a.className = "maps-item-content-header-link";
						a.href = link;
						a.textContent = link;
						headerLinkContainer.appendChild(a);
					});
				}
			}

			// Обработка адреса
			var addressParts = [];
			if (item.Country && item.Country.trim() !== "") addressParts.push(item.Country.trim());
			if (item.City && item.City.trim() !== "") addressParts.push(item.City.trim());
			if (item.Address && item.Address.trim() !== "") addressParts.push(item.Address.trim());
			var fullAddress = addressParts.length > 0 ? addressParts.join(', ') : "Неизвестный адрес";
			modal.querySelector('.city-list-adress-text').textContent = fullAddress;

			// Время работы
			var workTimeWrapper = modal.querySelector('.maps-item-content-time-wrapper'),
				workTimeContainer = modal.querySelector('.maps-item-content-time-contain');
			if (item["Work time"] && item["Work time"].trim() !== "") {
				workTimeWrapper.style.display = "flex";
				workTimeContainer.innerHTML = "";
				var segments = item["Work time"].split(";");
				segments.forEach(function (segment) {
					segment = segment.trim();
					if (!segment) return;
					var parts = segment.split(" - ");
					if (parts.length < 2) return;
					var dayPart = parts[0].trim(),
						timePart = parts.slice(1).join(" - ").trim(),
						timeItemDiv = document.createElement("div");
					timeItemDiv.className = "maps-item-content-time-item";
					var dayDiv = document.createElement("div");
					dayDiv.className = "maps-item-content-time-item-day";
					dayDiv.textContent = dayPart;
					var timeDiv = document.createElement("div");
					timeDiv.className = "maps-item-content-time-item-time";
					timeDiv.textContent = timePart;
					timeItemDiv.appendChild(dayDiv);
					timeItemDiv.appendChild(timeDiv);
					workTimeContainer.appendChild(timeItemDiv);
				});
			} else {
				workTimeWrapper.style.display = "none";
			}

			// Телефон
			var phoneWrapper = modal.querySelector('.maps-item-phone-wrapper');
			phoneWrapper.style.display = "none";
			if (item.Phone && item.Phone.trim() !== "") {
				phoneWrapper.innerHTML = "";
				var phones = parsePhoneNumbers(item.Phone);
				if (phones.length > 0) {
					phoneWrapper.style.display = "flex";
					phones.forEach(function (phoneObj) {
						var phoneAnchor = document.createElement("a");
						phoneAnchor.className = "w-inline-block";
						phoneAnchor.href = "tel:" + phoneObj.link;
						phoneAnchor.innerHTML = ` 
              <img src="https://cdn.prod.website-files.com/67880ce670c80f8dc8b685a0/6793c14a2f81e64b74c5b939_phone.svg" loading="lazy" alt="">
              <div class="maps-item-phone-text">${phoneObj.display}</div>`;
						phoneWrapper.appendChild(phoneAnchor);
					});
				}
			}

			// === Email ===
			var emailStr = (item.Email || item.email || "").trim();
			var mailWrapper = modal.querySelector('.maps-item-mail-wrapper');
			var mailText = modal.querySelector('.maps-item-mail-text');
			if (emailStr !== "") {
				var emails = emailStr.split(/[\n,;]/).map(function (e) { return e.trim(); }).filter(function (e) { return e !== ""; });
				if (mailText) {
					mailText.innerHTML = emails.join("<br>");
				}
				mailWrapper.href = "mailto:" + emails.join(",");
				mailWrapper.style.display = "flex";
			} else {
				mailWrapper.style.display = "none";
			}

			// Флаг страны
			modal.querySelector('.image-country').src = "https://flagcdn.com/24x18/" + getCountryCode(item.Country) + ".png";
		}

		// -------------------
		// Обработчик кнопки Back – закрывает модальное окно и сбрасывает центр карты
		// -------------------
		var backBtn = document.querySelector('.back-bttn');
		if (backBtn) {
			backBtn.addEventListener('click', function () {
				var modal = document.querySelector('.maps-item-content');
				modal.style.display = 'none';
				myMap.setCenter([50.02788623019044, 19.944986789507716], 5);
			});
		}

		// Первоначальное отображение: все метки на карте, список точек пуст (фильтры не выбраны)
		updateMap();
	});
};
