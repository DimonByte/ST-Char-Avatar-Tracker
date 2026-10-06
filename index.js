// @ts-ignore
const { eventSource, event_types, extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();

const MODULE_NAME = 'st_char_avatar_tracker';
const CHAT_RENDER_DELAY_MS = 300; // chat DOM isn't ready the instant chat_id_changed fires

const defaultSettings = Object.freeze({
    enabled: true,     // master on/off switch
    stayClosed: false, // if true, a closed panel stays closed until re-enabled or the chat changes
});

let currentImgSrc = null;  // last character avatar we showed
let dismissed = false;     // true after the user closes the panel
let chatChangeTimer = null;

/* ------------------------------ Settings ------------------------------ */

function getSettings() {
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = {};
    }
    const settings = extensionSettings[MODULE_NAME];
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (!Object.hasOwn(settings, key)) {
            settings[key] = value;
        }
    }
    return settings;
}

function addSettingsUI() {
    const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!container) {
        console.warn('[ST CHAR Avatar Tracker] Extensions settings container not found.');
        return;
    }

    const settings = getSettings();
    container.insertAdjacentHTML('beforeend', `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>ST CHAR Avatar Tracker</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label" for="st_char_avatar_enabled">
                    <input type="checkbox" id="st_char_avatar_enabled" ${settings.enabled ? 'checked' : ''}>
                    <span>Enabled</span>
                </label>
                <label class="checkbox_label" for="st_char_avatar_stay_closed">
                    <input type="checkbox" id="st_char_avatar_stay_closed" ${settings.stayClosed ? 'checked' : ''}>
                    <span>Stay closed once I close it</span>
                </label>
            </div>
        </div>
    `);

    document.getElementById('st_char_avatar_enabled').addEventListener('change', (e) => {
        settings.enabled = e.target.checked;
        saveSettingsDebounced();
        if (settings.enabled) {
            dismissed = false;
            CharZoom();
        } else {
            removeZoomedAvatar();
        }
    });

    document.getElementById('st_char_avatar_stay_closed').addEventListener('change', (e) => {
        settings.stayClosed = e.target.checked;
        saveSettingsDebounced();
    });
}

/* ------------------------------ Panel ------------------------------ */

function removeZoomedAvatar() {
    const panel = document.querySelector('.zoomed_avatar.draggable');
    if (panel) {
        panel.remove();
    }
}

function updateOrCreateZoomedAvatar(imgSrc) {
    let zoomedAvatarDiv = document.querySelector('.zoomed_avatar.draggable');

    if (zoomedAvatarDiv) {
        const zoomedImage = zoomedAvatarDiv.querySelector('.zoomed_avatar_img');

        // Nothing to do if the panel already shows this avatar
        if (zoomedImage && zoomedImage.getAttribute('src') === imgSrc) {
            return;
        }

        if (zoomedImage) {
            zoomedImage.setAttribute('src', imgSrc);
            zoomedImage.setAttribute('data-izoomify-url', imgSrc);
        }
        zoomedAvatarDiv.setAttribute('forchar', imgSrc);
        zoomedAvatarDiv.setAttribute('id', `zoomFor_${imgSrc}`);
        const dragGrabber = zoomedAvatarDiv.querySelector('.drag-grabber');
        if (dragGrabber) {
            dragGrabber.setAttribute('id', `zoomFor_${imgSrc}header`);
        }
    } else {
        zoomedAvatarDiv = document.createElement('div');
        zoomedAvatarDiv.className = 'zoomed_avatar draggable';
        zoomedAvatarDiv.setAttribute('forchar', imgSrc);
        zoomedAvatarDiv.setAttribute('id', `zoomFor_${imgSrc}`);
        zoomedAvatarDiv.setAttribute('style', 'display: flex;');

        zoomedAvatarDiv.innerHTML = `
            <div class="panelControlBar flex-container">
                <div class="fa-fw fa-solid fa-grip drag-grabber" id="zoomFor_${imgSrc}header"></div>
                <div class="fa-fw fa-solid fa-circle-xmark dragClose" id="closeZoom"></div>
            </div>
            <div class="zoomed_avatar_container">
                <img class="zoomed_avatar_img" src="${imgSrc}" data-izoomify-url="${imgSrc}" data-izoomify-magnify="1.8" data-izoomify-duration="300" alt="">
            </div>
        `;

        document.body.appendChild(zoomedAvatarDiv);
    }
}

// Handle the panel's X button ourselves. SillyTavern's own close handler doesn't reliably act on a panel we created, so remove it directly and remember that the user dismissed it so we don't instantly re-open it.
document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) {
        return;
    }
    const closeButton = e.target.closest('.zoomed_avatar .dragClose');
    if (closeButton) {
        dismissed = true;
        const panel = closeButton.closest('.zoomed_avatar');
        if (panel) {
            panel.remove();
        }
    }
}, true);

/* ------------------------------ Tracking ------------------------------ */

function CharZoom() {
    if (!getSettings().enabled || dismissed) {
        return;
    }

    // Most recent character (non-user) message, not just the last message overall
    const charMessages = document.querySelectorAll('.mes[is_user="false"]');
    const lastCharMsg = charMessages[charMessages.length - 1];

    if (!lastCharMsg) {
        return; // nothing to show yet (e.g. brand new chat)
    }

    const charName = lastCharMsg.getAttribute('ch_name');
    if (!charName) {
        console.error('[ST CHAR Avatar Tracker] Character name not found.');
        return;
    }

    currentImgSrc = `/characters/${encodeURIComponent(charName)}.png`;
    updateOrCreateZoomedAvatar(currentImgSrc);
}

function onGenerationStarted() {
    // A new character message is coming: bring the panel back unless the user asked it to stay closed
    if (!getSettings().stayClosed) {
        dismissed = false;
    }
    CharZoom();
}

function onGenerationEnded() {
    CharZoom(); // respects "dismissed", so closing mid-generation sticks
}

function onChatChanged() {
    // Drop the previous chat's avatar immediately, then show the new one once the DOM is ready
    clearTimeout(chatChangeTimer);
    removeZoomedAvatar();
    currentImgSrc = null;
    dismissed = false;
    chatChangeTimer = setTimeout(CharZoom, CHAT_RENDER_DELAY_MS);
}

/* ------------------------------ Init ------------------------------ */

function init() {
    getSettings();
    addSettingsUI();

    eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(event_types.GENERATION_ENDED, onGenerationEnded);
    eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
