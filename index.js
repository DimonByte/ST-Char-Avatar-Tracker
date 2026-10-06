// @ts-ignore
const { eventSource, event_types } = SillyTavern.getContext();

function updateOrCreateZoomedAvatar(imgSrc) {
    let zoomedAvatarDiv = document.querySelector('.zoomed_avatar.draggable');

    if (zoomedAvatarDiv) {
        const zoomedImage = zoomedAvatarDiv.querySelector('.zoomed_avatar_img');
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

let zoomedAvatarObserver = null;
let currentImgSrc = null;

// Re-add the zoomed avatar if it gets removed, always using the latest character image
function ensureZoomedAvatarExists() {
    if (zoomedAvatarObserver) return; // only need one observer

    zoomedAvatarObserver = new MutationObserver(() => {
        if (currentImgSrc && !document.querySelector('.zoomed_avatar.draggable')) {
            updateOrCreateZoomedAvatar(currentImgSrc);
        }
    });
    zoomedAvatarObserver.observe(document.body, { childList: true, subtree: true });
}

function CharZoom() {
    // Find the most recent character (non-user) message, not just the last message overall
    const charMessages = document.querySelectorAll('.mes[is_user="false"]');
    const lastCharMsg = charMessages[charMessages.length - 1];

    if (!lastCharMsg) {
        console.error('No character message found.');
        return;
    }

    const charName = lastCharMsg.getAttribute('ch_name');
    if (!charName) {
        console.error('Character Name not Found.');
        return;
    }

    currentImgSrc = `/characters/${charName}.png`;
    updateOrCreateZoomedAvatar(currentImgSrc);
    ensureZoomedAvatarExists();
}

eventSource.on('generation_started', CharZoom);
eventSource.on('generation_ended', CharZoom);
eventSource.on('chat_id_changed', () => setTimeout(CharZoom, 300));