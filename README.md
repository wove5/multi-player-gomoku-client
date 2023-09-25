# UNE COSC360 2023 Assessment 2

1. install dependencies: `yarn`
2. start the app: `yarn start`
3. go to [localhost:3000](http://localhost:3000)
4. start playing game

   - Select a board size from the dropdown box below the START NEW GAME button
   - there are 6 different preset board sizes to choose from:

     - 5x5, 6x6, 7x7, 8x8, 9x9, 10x10
     - the sizes are all even square dimensions
     - the author decided on square size games only, to simplify initial development
     - it would not be difficult to enable creating rectangular sized games - watch this space

   - click START NEW GAME button
   - login to game (if not already logged in). Login options are:
     1. username: admin, password: admin
     2. username: le-kang, password: awp
     3. username: david, password: 1234
   - after successful login, you will be taken to the home page
   - click positions on board
   - black will be first color applied
   - white will be the following color applied
   - colors applied will alternate between turns
   - winner is first color to make 5 selections in a straight line
   - game ends when:
     - winner is determined or
     - game is drawn, which means all board positions are selected with no winner
   - no more playing can occur after game ends
   - during the game, three buttons are always displayed below the board:

     - Restart: clicking this will clear all the selected positions in the current game
       - game is still active, however it is back to the initial state with next player BLACK
     - Pause: this will take the user back to the home page, keeping the game saved in localstorage
     - Leave: this will take the user back to the home page, deleting the game from localstorage

   - when the game is won or drawn:
     - the Restart and Pause buttons are removed
     - the game becomes inactive and remains displayed
     - the game is retained permanently in localstorage
     - the Leave button will take the user to the games "history" page
   - the games history page:
     - shows the list of previously completed games
     - each game listed shows:
       - game name
       - game end date (and game start date if game endured for more than one day)
       - game result
       - View Game Log button that takes the user to the game-log page for that game
   - the game-log page shows:
     - a view of the game state at game completion showing selected board positions
     - game name & completed date at the top of the board, (and start date if game duration > 1 day)
     - game result immediately above the board
     - each selected position annotated with a positive integer number indicating order of selections
     - a Back button that takes the user back to the games history page
       &nbsp;<br>
       &nbsp;<br>

5. The web app header contains anywhere from 1 to 3 buttons dependant on login status and currently rendered page:

   - GOMOKU button takes the user to the home page
   - Previous Games button will take the user to the games history page - it is only visible when logged in
   - Logout button will take the user to the home page - it is only visible when logged in
   - Login button takes the user to the login page - it is only visible when not logged in

6. The home page:

   - START NEW GAME button
     - if board size selected from dropdown box
       - will take the user to the login page if user is not logged in
       - will take the user to a new game if they are logged in
     - if no board size selected
       - button does nothing
   - RESUME INCOMPLETE GAME button
     - if a game is selected from the dropdown box
       - will take the user to the selected game that is still in progress
     - if a game is not selected
       - button does nothing
