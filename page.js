class Page {
    constructor(){
        this.softLeft = {
            label: '',
            fn: () => {}
        }
        this.softRight = {
            label: '',
            fn: () => {}
        }
        this.arrive = () => {}
        this.center = {
            label: '',
            fn: () => {}
        }
        this.back = () => {}
        this.active = false

        this.div = $("<div />").addClass('page')
        this.softkeyCont = $("<footer />").addClass('softkey-cont').appendTo(this.div)
        this.softkeyCont2 = $("<footer />").addClass('softkey-cont').appendTo(this.div)
        this.softLeftSpan = $("<span />").addClass('left').hide().appendTo(this.softkeyCont2)
        this.centerSpan = $("<span />").addClass('center').hide().appendTo(this.softkeyCont)
        this.softRightSpan = $("<span />").addClass('right').hide().appendTo(this.softkeyCont2)
    }

    render(){
        this.softLeftSpan.text(this.softLeft.label).toggle(this.softLeft.label != '')
        this.centerSpan.text(this.center.label).toggle(this.center.label != '')
        this.softRightSpan.text(this.softRight.label).toggle(this.softRight.label != '')
        
        return this.div
    }

    activate(){
        this.active = true
        this.div.addClass('active')
    }

    deactivate(){
        this.active = false
        this.div.removeClass('active')
    }

    append(elem){
        this.div.append(elem)
        return this
    }
}

class PagedApp {
    constructor(){
        this.pages = []
        this.active = 0

        document.activeElement.addEventListener('keydown', this.keydown.bind(this));
    }
    
    keydown(e) {
        console.log("keydown", e.key)
        switch(e.key) {
            case 'SoftRight':
            case 'd':
                console.log("sending SoftRight")
                console.log(this.pages[this.active].softRight)
                this.pages[this.active].softRight.fn()
                break;
            case 'SoftLeft':
            case 'a':
                console.log("sending SoftLeft")
                this.pages[this.active].softLeft.fn()
                break
            case 'Enter':
                this.pages[this.active].center.fn()
                break
            case 'ArrowUp':
                this.move(-1);
                break;
            case 'ArrowDown':
                this.move(1);
                break;
            case 'Backspace':
                if(this.active != 0){
                    e.preventDefault()
                    e.stopPropagation()
                }
                this.pages[this.active].back()
                break
            case 'ArrowLeft':
            case 'ArrowRight':
                e.preventDefault()
                e.stopPropagation()
                break
        }
    }

    addPage(page){
        page.number = this.pages.length
        if(this.pages.length == 0){
            page.activate()
        }
        this.pages.push(page)
    }

    render(elem){
        const pages_cont = $("<div />")

        for(var number in this.pages){
            var page = this.pages[number]
            
            page.div.css('left', 240*number)
            pages_cont.append(page.render())
        }
        $(elem).append(pages_cont)
    }

    newPage(){
        const page = new Page()
        this.addPage(page)
        return page
    }

    nav(to_page, smooth=true){
        console.log("moving to page", to_page.number)

        if(to_page.number < 0){ //@TODO: or more than the max
            return;
        }

        this.pages[this.active].deactivate()
        this.active = to_page.number
        this.pages[this.active].activate()

        smooth = false

        window.scroll({
            top: 0,
            left: 240 * to_page.number,
            behavior: smooth ? 'smooth' : 'auto'
        });
        console.log(240 * to_page.number, window.scrollX)
    }

    move(dir) {
        const navs = this.pages[this.active].div.find("[tabindex]")
        console.log(navs)
        const current_focus = $(":focus")
        const index = navs.index(current_focus) + dir
        if(index < 0 || index >= navs.length){
            return
        }
        navs[index].focus()
    }
}